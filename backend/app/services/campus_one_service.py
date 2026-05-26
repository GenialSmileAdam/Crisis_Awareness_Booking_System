from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.users import User, UserRole
from app.models.students import Student
from app.core.security import hash_password
import uuid


class CampusOneService:
    @staticmethod
    async def get_or_create_user_from_oidc_claims(
        db: AsyncSession, claims: Dict[str, Any]
    ) -> tuple[User, bool]:
        """
        Get or create a user from Campus One OIDC claims.
        Returns: (User, is_new_user)
        """
        campus_one_id = claims.get("sub")
        email = claims.get("email")
        full_name = claims.get("name", "")
        role_str = claims.get("role", "student")

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
            existing_user.email = email  # Always use Campus One email
            await db.commit()
            return existing_user, False

        # Create new user
        role = UserRole.student if role_str == "student" else UserRole.staff
        is_admin = role_str == "admin"

        new_user = User(
            id=uuid.uuid4(),
            campus_one_id=campus_one_id,
            email=email,
            full_name=full_name,
            password_hash=hash_password(""),  # Dummy hash for OIDC users
            role=role,
            is_admin=is_admin,
            is_active=True,
        )

        db.add(new_user)
        await db.flush()

        # If student, create corresponding student record
        if role == UserRole.student:
            student_id = claims.get("student_id", f"c1_{campus_one_id[:12]}")
            student = Student(
                student_id=student_id,
                user_id=new_user.id,
                faculty=claims.get("faculty"),
                department=claims.get("department_id"),
                class_level=claims.get("level"),
                year_of_study=claims.get("year_of_study"),
                program=claims.get("programme"),
            )
            db.add(student)

        await db.commit()
        return new_user, True

    @staticmethod
    async def update_user_from_claims(
        db: AsyncSession, user: User, claims: Dict[str, Any]
    ) -> None:
        """Update user attributes from latest Campus One claims."""
        user.full_name = claims.get("name", user.full_name)
        user.email = claims.get("email", user.email)

        # If student, update student record
        if user.role == UserRole.student:
            result = await db.execute(
                select(Student).where(Student.user_id == user.id)
            )
            student = result.scalar_one_or_none()

            if student:
                student.faculty = claims.get("faculty") or student.faculty
                student.department = (
                    claims.get("department_id") or student.department
                )
                student.class_level = claims.get("level") or student.class_level
                student.year_of_study = (
                    claims.get("year_of_study") or student.year_of_study
                )
                student.program = claims.get("programme") or student.program

        await db.commit()
