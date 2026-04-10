from datetime import datetime, timedelta, timezone
from typing import Dict

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.models import RefreshToken, User
from app.models.staff import Staff
from app.models.students import Student
from app.models.users import UserRole
from app.schemas.auth import RegisterRequest


class AuthService:
    @staticmethod
    async def _get_identity_claims(db: AsyncSession, user: User) -> dict:
        staff = None
        student = None
        if user.role == UserRole.staff:
            staff = (
                await db.execute(select(Staff).where(Staff.user_id == user.id))
            ).scalar_one_or_none()
        elif user.role == UserRole.student:
            student = (
                await db.execute(select(Student).where(Student.user_id == user.id))
            ).scalar_one_or_none()

        staff_type = staff.staff_type.value if staff else None
        return {
            "user_type": user.role.value,
            "is_admin": bool(user.is_admin),
            "staff_type": staff_type,
            "staff_id": staff.staff_id if staff else None,
            "student_id": student.student_id if student else None,
        }

    @classmethod
    async def register(cls, db: AsyncSession, data: RegisterRequest) -> dict:
        existing = await db.execute(
            select(User).where(User.email == data.email, User.deleted_at.is_(None))
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )

        if data.user_type == "staff":
            existing_staff = await db.execute(select(Staff).where(Staff.staff_id == data.staff_id))
            if existing_staff.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Staff ID already exists",
                )
        if data.user_type == "student":
            existing_student = await db.execute(
                select(Student).where(Student.student_id == data.student_id)
            )
            if existing_student.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Student ID already exists",
                )

        user = User(
            email=data.email,
            password_hash=security.hash_password(data.password),
            full_name=data.full_name,
            role=UserRole(data.user_type),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
        await db.flush()

        if data.user_type == "staff":
            db.add(
                Staff(
                    user_id=user.id,
                    staff_id=data.staff_id,
                    staff_type=data.staff_type,
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
        identity = await cls._get_identity_claims(db, user)
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.role.value,
            "is_admin": user.is_admin,
            "effective_role": security.determine_effective_role(
                identity["user_type"], identity["is_admin"], identity["staff_type"]
            ),
            "staff_id": identity["staff_id"],
            "student_id": identity["student_id"],
            "staff_type": identity["staff_type"],
        }

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> Dict[str, str]:
        stmt = select(User).where(
            User.email == email,
            User.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user is None or not user.password_hash or not security.verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive",
            )

        identity = await AuthService._get_identity_claims(db, user)
        access_token = security.create_access_token(
            str(user.id),
            identity["user_type"],
            is_admin=identity["is_admin"],
            staff_type=identity["staff_type"],
            staff_id=identity["staff_id"],
            student_id=identity["student_id"],
        )
        refresh_token = security.create_refresh_token(str(user.id))
        token_hash = security.hash_token(refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        await db.commit()

        return {"access_token": access_token, "refresh_token": refresh_token}

    @staticmethod
    async def refresh(db: AsyncSession, refresh_token: str) -> Dict[str, str]:
        token_hash = security.hash_token(refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        token = result.scalar_one_or_none()

        if token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        # Reuse detection
        if token.revoked:
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == token.user_id)
                .values(revoked=True)
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security violation detected",
            )

        now = datetime.now(timezone.utc)
        if token.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        user = await db.get(User, token.user_id)
        if user is None or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        # revoke current token
        token.revoked = True

        identity = await AuthService._get_identity_claims(db, user)
        new_access = security.create_access_token(
            str(user.id),
            identity["user_type"],
            is_admin=identity["is_admin"],
            staff_type=identity["staff_type"],
            staff_id=identity["staff_id"],
            student_id=identity["student_id"],
        )
        new_refresh = security.create_refresh_token(str(user.id))
        new_hash = security.hash_token(new_refresh)
        new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=new_hash,
                expires_at=new_expires,
            )
        )
        await db.commit()

        return {"access_token": new_access, "refresh_token": new_refresh}

    @staticmethod
    async def logout(db: AsyncSession, refresh_token: str) -> None:
        token_hash = security.hash_token(refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        token = result.scalar_one_or_none()

        if token:
            token.revoked = True
            await db.commit()
