from datetime import datetime, timezone
from typing import Dict, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.models.staff import Staff
from app.models.students import Student
from app.models.users import User, UserRole
from app.schemas.users import PasswordChange, UserCreate, UserUpdate
from app.utils.pagination import paginate


class UserService:
    @staticmethod
    async def _serialize_user(db: AsyncSession, user: User) -> Dict:
        staff = None
        student = None
        if user.role == UserRole.staff:
            staff = (await db.execute(select(Staff).where(Staff.user_id == user.id))).scalar_one_or_none()
        elif user.role == UserRole.student:
            student = (await db.execute(select(Student).where(Student.user_id == user.id))).scalar_one_or_none()

        staff_type = staff.staff_type.value if staff else None
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "date_of_birth": user.date_of_birth,
            "gender": user.gender,
            "user_type": user.role.value,
            "is_admin": user.is_admin,
            "effective_role": security.determine_effective_role(user.role.value, user.is_admin, staff_type),
            "staff_id": staff.staff_id if staff else None,
            "student_id": student.student_id if student else None,
            "staff_type": staff_type,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }

    @classmethod
    async def create(cls, db: AsyncSession, data: UserCreate) -> Dict:
        existing = await db.execute(
            select(User).where(User.email == data.email, User.deleted_at.is_(None))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
            )

        if data.user_type == "staff":
            existing_staff = await db.execute(select(Staff).where(Staff.staff_id == data.staff_id))
            if existing_staff.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Staff ID already exists"
                )
        if data.user_type == "student":
            existing_student = await db.execute(select(Student).where(Student.student_id == data.student_id))
            if existing_student.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Student ID already exists"
                )

        temporary_password = data.password or security.generate_temporary_password()

        user = User(
            email=data.email,
            password_hash=security.hash_password(temporary_password),
            full_name=data.full_name,
            phone=data.phone,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            role=UserRole(data.user_type),
            is_admin=data.is_admin if data.user_type == "staff" else False,
        )
        db.add(user)
        await db.flush()

        if data.user_type == "staff":
            db.add(
                Staff(
                    user_id=user.id,
                    staff_id=data.staff_id,
                    staff_type=data.staff_type,
                    department=None,
                    hire_date=None,
                    specialization=None,
                    max_appointments_per_day=8,
                )
            )
        else:
            db.add(
                Student(
                    user_id=user.id,
                    student_id=data.student_id,
                    class_level=data.class_level,
                    guidance_counselor=data.guidance_counselor,
                    emergency_contact=data.emergency_contact,
                    emergency_phone=data.emergency_phone,
                    crisis_flag=False,
                )
            )

        await db.commit()
        await db.refresh(user)
        serialized_user = await cls._serialize_user(db, user)
        serialized_user["temporary_password"] = temporary_password
        return serialized_user

    @classmethod
    async def get_all(
        cls,
        db: AsyncSession,
        filters: Dict[str, Optional[str]],
        limit: int,
        offset: int,
    ) -> Dict:
        conditions = [User.deleted_at.is_(None)]
        user_type_filter = filters.get("user_type")
        active_filter = filters.get("is_active")

        if user_type_filter:
            conditions.append(User.role == UserRole(user_type_filter))
        if active_filter is not None:
            conditions.append(User.is_active == active_filter)

        base_stmt: Select = select(User).where(*conditions).order_by(User.created_at.desc())
        total_stmt = select(func.count()).select_from(select(User).where(*conditions).subquery())

        total = (await db.execute(total_stmt)).scalar_one()
        result = await db.execute(base_stmt.limit(limit).offset(offset))
        users = result.scalars().all()

        data = [await cls._serialize_user(db, user) for user in users]
        return paginate(data=data, total=total, limit=limit, offset=offset)

    @classmethod
    async def get_by_id(cls, db: AsyncSession, user_id: UUID) -> Dict:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return await cls._serialize_user(db, user)

    @classmethod
    async def update(cls, db: AsyncSession, user_id: UUID, data: UserUpdate) -> Dict:
        result = await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        user.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(user)
        return await cls._serialize_user(db, user)

    @staticmethod
    async def change_password(
        db: AsyncSession, user_id: UUID, data: PasswordChange, skip_verification: bool = False
    ) -> None:
        result = await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if not skip_verification:
            if not user.password_hash or not security.verify_password(data.current_password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect",
                )

        user.password_hash = security.hash_password(data.new_password)
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
