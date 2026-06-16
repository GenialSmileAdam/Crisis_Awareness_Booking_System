from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.users import User, UserRole
from app.models.students import Student
from app.models.staff import Staff, StaffType
from app.core.security import hash_password
import uuid
import logging

logger = logging.getLogger(__name__)


class CampusOneService:
    @staticmethod
    def _determine_user_role_and_type(claims: Dict[str, Any]) -> tuple[UserRole, bool, StaffType | None]:
        """
        Determine user role, admin status, and staff type from Campus One claims.

        Campus One roles: student, staff, admin, therapist, mentor, developer, employer,
                         consultant, founder, alumni, auditor, external

        Returns: (UserRole, is_admin, staff_type_or_none)
        """
        primary_role = claims.get("role", "student")
        roles = claims.get("roles", [primary_role])
        custom_roles = claims.get("custom_roles", [])

        logger.info(f"Campus One claims - role: {primary_role}, roles: {roles}, custom_roles: {custom_roles}")

        # Handle external users (non-university affiliates)
        if primary_role == "external":
            logger.warning(f"External user detected - may have restricted access")
            return UserRole.student, False, None  # Treat as student with no special privileges

        is_admin = False  # Determined from database, not Campus One

        # Determine user role and staff type
        if primary_role == "student":
            return UserRole.student, is_admin, None

        # Map Campus One staff roles to our staff_type
        # Custom roles and the roles array take priority over primary_role
        staff_type = None

        if "psychologist" in custom_roles or "psychologist" in roles:
            staff_type = StaffType.psychologist
        elif primary_role == "therapist" or "therapist" in roles:
            staff_type = StaffType.psychologist
        elif "counselor" in custom_roles or "counselor" in roles:
            staff_type = StaffType.counselor
        elif "unit_head" in roles or "unit_admin" in roles or "unit_head" in custom_roles or "unit_admin" in custom_roles:
            staff_type = StaffType.administrator
        elif primary_role == "administrator" or "administrator" in roles:
            staff_type = StaffType.administrator
        else:
            staff_type = StaffType.support_staff

        return UserRole.staff, is_admin, staff_type

    @staticmethod
    async def get_or_create_user_from_oidc_claims(
        db: AsyncSession, claims: Dict[str, Any]
    ) -> tuple[User, bool]:
        """
        Get or create a user from Campus One OIDC claims.
        Maps Campus One claims to SafeSpace user and role records.

        Returns: (User, is_new_user)
        """
        campus_one_id = claims.get("sub")
        email = claims.get("email")
        full_name = claims.get("name", "")

        if not campus_one_id or not email:
            raise ValueError("Missing required claims: sub (campus_one_id) or email")

        # Try to find existing user by campus_one_id or email
        query = select(User).where(
            (User.campus_one_id == campus_one_id) | (User.email == email)
        )
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Update with latest Campus One data
            existing_user.campus_one_id = campus_one_id
            existing_user.full_name = full_name or existing_user.full_name
            existing_user.email = email
            await db.commit()
            return existing_user, False

        # Determine role, admin status, and staff type
        user_role, is_admin, staff_type = CampusOneService._determine_user_role_and_type(claims)

        new_user = User(
            id=uuid.uuid4(),
            campus_one_id=campus_one_id,
            email=email,
            full_name=full_name,
            password_hash=hash_password(""),  # Dummy hash for OIDC users
            role=user_role,
            is_admin=is_admin,
            is_active=True,
        )

        db.add(new_user)
        await db.flush()

        # Create Staff record for staff users
        if user_role == UserRole.staff and staff_type:
            staff = Staff(
                user_id=new_user.id,
                staff_id=claims.get("staff_id", f"st_{campus_one_id[:12]}"),
                staff_type=staff_type,
                department=claims.get("department") or claims.get("department_id"),
                specialization=claims.get("specialization"),
            )
            db.add(staff)
            logger.info(f"Created staff user {new_user.id} with staff_type: {staff_type}")
            await db.flush()
            if staff_type == StaffType.psychologist:
                from app.services.staff_service import StaffService
                await StaffService._seed_default_availability(db, new_user.id)

        # Create Student record for student users
        elif user_role == UserRole.student:
            student_id = claims.get("student_id", f"c1_{campus_one_id[:12]}")
            # Map Campus One field names to our schema
            student = Student(
                student_id=student_id,
                user_id=new_user.id,
                faculty=claims.get("faculty_id"),  # Campus One uses faculty_id
                department=claims.get("department_id"),
                class_level=str(claims.get("level")) if claims.get("level") else None,  # Campus One uses level (number)
                year_of_study=claims.get("year_of_study"),
                program=claims.get("programme") or claims.get("study_level"),  # study_level from Campus One
            )
            db.add(student)
            logger.info(f"Created student user {new_user.id} with student_id: {student_id}")

        await db.commit()
        return new_user, True

    @staticmethod
    async def update_user_from_claims(
        db: AsyncSession, user: User, claims: Dict[str, Any]
    ) -> None:
        """Update user attributes from latest Campus One claims."""
        user.full_name = claims.get("name", user.full_name)
        user.email = claims.get("email", user.email)

        # Update role information if changed
        user_role, _, staff_type = CampusOneService._determine_user_role_and_type(claims)
        user.role = user_role
        # user.is_admin is preserved (determined from database)

        # If student, update student record
        if user.role == UserRole.student:
            result = await db.execute(
                select(Student).where(Student.user_id == user.id)
            )
            student = result.scalar_one_or_none()

            if student:
                student.faculty = claims.get("faculty_id") or student.faculty
                student.department = claims.get("department_id") or student.department
                student.class_level = str(claims.get("level")) if claims.get("level") else student.class_level
                student.year_of_study = claims.get("year_of_study") or student.year_of_study
                student.program = (claims.get("programme") or claims.get("study_level")) or student.program

        # If staff, update staff record
        elif user.role == UserRole.staff and staff_type:
            result = await db.execute(
                select(Staff).where(Staff.user_id == user.id)
            )
            staff = result.scalar_one_or_none()

            if staff:
                staff.staff_type = staff_type
                staff.department = claims.get("department") or claims.get("department_id") or staff.department

        await db.commit()
