from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db

bearer_scheme = HTTPBearer()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def determine_effective_role(user_type: str, is_admin: bool, staff_type: str | None = None) -> str:
    if is_admin:
        return "admin"
    if user_type == "staff" and staff_type == "psychologist":
        return "psychologist"
    return user_type


def hash_password(password: str) -> str:
    """Hash password with bcrypt cost factor 10 (still strong, 4x faster than 12)."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def generate_temporary_password(length: int = 18) -> str:
    """Generate a cryptographically strong temporary password."""
    if length < 12:
        raise ValueError("Temporary password length must be at least 12 characters")
    return secrets.token_urlsafe(length)[:length]

def create_access_token(
    user_id: str,
    user_type: str,
    full_name: str,
    roles: list[str] | None = None,
    *,
    is_admin: bool = False,
    staff_type: str | None = None,
    staff_id: str | None = None,
    student_id: str | None = None,
    email: str | None = None,
) -> str:
    """Create short-lived JWT access token (15 min by default).

    Authorization is based on the roles array from Campus One:
    - "unit_head" → admin access
    - "psychologist" → psychologist access
    - "student" → student access
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Use Campus One roles directly
    campus_roles = roles or []

    # Determine role from database fields (for display/fallback)
    if is_admin:
        role = "admin"
    elif user_type == "staff" and staff_type == "psychologist":
        role = "psychologist"
    else:
        role = user_type

    payload = {
        "sub": user_id,
        "user_type": user_type,
        "name": full_name,
        "role": role,
        "is_admin": is_admin,
        "roles": campus_roles,  # Campus One roles array - authorization based on these!
        "staff_type": staff_type,
        "staff_id": staff_id,
        "student_id": student_id,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create long-lived refresh token string (random, NOT a JWT)."""
    # Use user_id only for entropy mixing, not stored
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """Hash a refresh token for storage — use hashlib.sha256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def get_current_user_from_refresh_token(
    request: Request, db: AsyncSession = Depends(get_db)
) -> dict:
    """Get current user from refresh_token cookie (for OIDC callback).

    Used by /auth/me endpoint to identify user via secure HTTP-only cookie.
    """
    from app.models.refresh_tokens import RefreshToken
    from app.models.users import User

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        # Hash the token to find it in database
        token_hash = hash_token(refresh_token)

        # Look up the refresh token in database
        result = await db.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .where(RefreshToken.revoked == False)
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        # Check if token is expired
        from datetime import datetime, timezone
        if db_token.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        # Get the user
        result = await db.execute(select(User).where(User.id == db_token.user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        # Determine role from database
        if user.is_admin:
            role = "admin"
        elif user.role == "staff":
            role = "staff"
        else:
            role = user.role

        return {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "role": role,
            "user_type": user.role,  # Map database role to user_type
            "is_admin": user.is_admin,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Verify JWT access token. Return {"id": UUID, "role": str}.
    Raise 401 if token is invalid, expired, or missing.
    CRITICAL: This function signature must not change — all routers depend on it.
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        subject = payload.get("sub")
        role = payload.get("role")
        user_type = payload.get("user_type")
        if subject is None or role is None or user_type is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        user_id = UUID(subject)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # ── Verify / provision user in the database ──
    from app.models.users import User
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user_record = result.scalar_one_or_none()

    if not user_record:
        # User not found in database! Let's dynamically create them.
        from app.services.campus_one_service import CampusOneService
        
        student_id = payload.get("student_id")
        staff_id = payload.get("staff_id")
        email = payload.get("email") or f"{student_id or staff_id or subject}@placeholder.local"
        
        claims = {
            "sub": subject,
            "email": email,
            "name": payload.get("name") or "OIDC User",
            "role": user_type,
            "roles": payload.get("roles") or ([role] if role else []),
            "custom_roles": [],
            "student_id": student_id,
            "staff_id": staff_id,
            "faculty_id": payload.get("faculty_id"),
            "department_id": payload.get("department_id"),
            "level": payload.get("level"),
            "year_of_study": payload.get("year_of_study"),
            "programme": payload.get("programme") or payload.get("program"),
            "study_level": payload.get("study_level"),
            "staff_type": payload.get("staff_type"),
            "user_id_override": user_id,
        }
        try:
            await CampusOneService.get_or_create_user_from_oidc_claims(db, claims)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to auto-create user from JWT in get_current_user: {e}", exc_info=True)

    return {
        "id": user_id,
        "name": payload.get("name"),
        "role": role,
        "user_type": user_type,
        "is_admin": bool(payload.get("is_admin", False)),
        "roles": payload.get("roles", []),  # Campus One roles array - authorization!
        "staff_type": payload.get("staff_type"),
        "staff_id": payload.get("staff_id"),
        "student_id": payload.get("student_id"),
    }




