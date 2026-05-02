from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

import requests
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.models import RefreshToken, Staff, Student, User
from app.models.staff import StaffType
from app.models.users import UserRole


class CampusSSOService:
    @staticmethod
    async def _find_local_user(
        db: AsyncSession,
        campus_user_id: str,
        email: str,
    ) -> tuple[User | None, str | None]:
        try:
            local_uuid = UUID(campus_user_id)
        except ValueError:
            local_uuid = None

        if local_uuid is not None:
            user = await db.get(User, local_uuid)
            if user and user.deleted_at is None:
                return user, "campus_id"

        result = await db.execute(
            select(User).where(
                User.email == email.lower(),
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()
        if user:
            return user, "email"

        return None, None

    @staticmethod
    def _request_json(url: str, cookie_header: str) -> dict:
        try:
            response = requests.get(
                url,
                headers={
                    "Accept": "application/json",
                    "Cookie": cookie_header,
                },
                timeout=settings.CAMPUS_ONE_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Campus One is currently unavailable",
            ) from exc

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            return {"user": None}

        if not response.ok:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Campus One session validation failed",
            )

        try:
            return response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Campus One returned an invalid response",
            ) from exc

    @classmethod
    def validate_session(cls, cookie_header: str | None) -> dict:
        if not cookie_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Campus One session cookie is missing",
            )

        payload = cls._request_json(settings.CAMPUS_ONE_SESSION_URL, cookie_header)
        user = payload.get("user")
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No active Campus One session",
            )

        required_fields = ("id", "email", "name", "role")
        if any(not user.get(field) for field in required_fields):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Campus One session response is incomplete",
            )

        return user

    @classmethod
    def get_profile(cls, cookie_header: str | None) -> dict | None:
        if not cookie_header:
            return None

        payload = cls._request_json(settings.CAMPUS_ONE_PROFILE_URL, cookie_header)
        if "user" in payload and payload.get("user") is None:
            return None
        return payload

    @staticmethod
    def _map_role(campus_role: str) -> tuple[UserRole, bool]:
        if campus_role == "student":
            return UserRole.student, False
        if campus_role == "admin":
            return UserRole.staff, True
        return UserRole.staff, False

    @staticmethod
    def _default_staff_type(campus_role: str) -> StaffType:
        if campus_role == "admin":
            return StaffType.administrator
        # The existing backend grants counselor dashboard access to
        # psychologist staff, so Campus staff default there unless a local
        # record already says otherwise.
        return StaffType.psychologist

    @staticmethod
    def _student_record_id(campus_user_id: str) -> str:
        compact = campus_user_id.replace("-", "").upper()
        return f"CAMPUS-{compact[:12]}"

    @staticmethod
    def _staff_record_id(campus_user_id: str) -> str:
        compact = campus_user_id.replace("-", "").upper()
        return f"CAMPUS-STF-{compact[:10]}"

    @staticmethod
    async def _issue_tokens(db: AsyncSession, user: User) -> dict[str, str]:
        identity = await CampusSSOService._get_identity_claims(db, user)
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
    async def _ensure_identity_record(
        cls,
        db: AsyncSession,
        user: User,
        campus_user: dict,
        profile: dict | None,
    ) -> None:
        if user.role == UserRole.student:
            student = (
                await db.execute(select(Student).where(Student.user_id == user.id))
            ).scalar_one_or_none()
            if student is None:
                db.add(
                    Student(
                        user_id=user.id,
                        student_id=cls._student_record_id(campus_user["id"]),
                        class_level=profile.get("studyLevel") if profile else None,
                        guidance_counselor=None,
                        emergency_contact=None,
                        emergency_phone=None,
                        crisis_flag=False,
                    )
                )
            elif profile and profile.get("studyLevel"):
                student.class_level = profile["studyLevel"]
            return

        staff = (
            await db.execute(select(Staff).where(Staff.user_id == user.id))
        ).scalar_one_or_none()
        if staff is None:
            db.add(
                Staff(
                    user_id=user.id,
                    staff_id=cls._staff_record_id(campus_user["id"]),
                    staff_type=cls._default_staff_type(campus_user["role"]),
                    department=profile.get("department") if profile else None,
                    max_appointments_per_day=8,
                )
            )
        elif not staff.department and profile and profile.get("department"):
            staff.department = profile["department"]

    @classmethod
    async def debug_cookie_state(
        cls,
        db: AsyncSession,
        cookie_header: str | None,
    ) -> dict:
        diagnostics = {
            "has_cookie_header": bool(cookie_header),
            "sign_in_url": settings.CAMPUS_ONE_SIGN_IN_URL,
            "campus_session_url": settings.CAMPUS_ONE_SESSION_URL,
            "campus_profile_url": settings.CAMPUS_ONE_PROFILE_URL,
        }

        if not cookie_header:
            diagnostics["session_valid"] = False
            diagnostics["reason"] = "Cookie header is missing"
            return diagnostics

        try:
            campus_user = cls.validate_session(cookie_header)
        except HTTPException as exc:
            diagnostics["session_valid"] = False
            diagnostics["reason"] = exc.detail
            diagnostics["status_code"] = exc.status_code
            return diagnostics

        profile = cls.get_profile(cookie_header) if campus_user["role"] == "student" else None
        local_user, matched_by = await cls._find_local_user(
            db,
            campus_user["id"],
            campus_user["email"],
        )

        diagnostics["session_valid"] = True
        diagnostics["campus_user"] = campus_user
        diagnostics["profile_found"] = bool(profile)
        diagnostics["local_user_match"] = {
            "matched": bool(local_user),
            "matched_by": matched_by,
            "local_user_id": str(local_user.id) if local_user else None,
            "local_role": local_user.role.value if local_user else None,
            "local_is_admin": bool(local_user.is_admin) if local_user else None,
        }
        return diagnostics

    @classmethod
    async def sync_user_from_cookie(
        cls,
        db: AsyncSession,
        cookie_header: str | None,
    ) -> dict:
        campus_user = cls.validate_session(cookie_header)
        profile = cls.get_profile(cookie_header) if campus_user["role"] == "student" else None

        local_role, is_admin = cls._map_role(campus_user["role"])
        user, matched_by = await cls._find_local_user(
            db,
            campus_user["id"],
            campus_user["email"],
        )

        if user is None:
            try:
                local_user_id = UUID(campus_user["id"])
            except ValueError:
                local_user_id = None

            user_kwargs = {
                "email": campus_user["email"].lower(),
                "password_hash": security.hash_password(
                    security.generate_temporary_password()
                ),
                "full_name": campus_user["name"],
                "role": local_role,
                "is_admin": is_admin,
                "is_active": True,
            }
            if local_user_id is not None:
                user_kwargs["id"] = local_user_id

            user = User(**user_kwargs)
            db.add(user)
            await db.flush()
        else:
            user.email = campus_user["email"].lower()
            user.full_name = campus_user["name"]
            user.role = local_role
            user.is_admin = is_admin
            user.is_active = True

        await cls._ensure_identity_record(db, user, campus_user, profile)
        await db.flush()

        tokens = await cls._issue_tokens(db, user)
        identity = await cls._get_identity_claims(db, user)

        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "user_type": identity["user_type"],
                "effective_role": security.determine_effective_role(
                    identity["user_type"],
                    identity["is_admin"],
                    identity["staff_type"],
                ),
                "is_admin": identity["is_admin"],
                "staff_type": identity["staff_type"],
                "staff_id": identity["staff_id"],
                "student_id": identity["student_id"],
                "campus_user_id": campus_user["id"],
                "campus_role": campus_user["role"],
                "campus_profile": profile,
                "matched_by": matched_by or "created",
            },
        }
