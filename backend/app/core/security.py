from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

bearer_scheme = HTTPBearer()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def determine_effective_role(user_type: str, is_admin: bool, staff_type: str | None = None) -> str:
    if is_admin:
        return "admin"
    if user_type == "staff" and staff_type == "psychologist":
        return "psychologist"
    return user_type


def hash_password(password: str) -> str:
    """Hash password with bcrypt cost factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    user_id: str,
    user_type: str,
    *,
    is_admin: bool = False,
    staff_type: str | None = None,
    staff_id: str | None = None,
    student_id: str | None = None,
) -> str:
    """Create short-lived JWT access token (15 min by default)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "user_type": user_type,
        "role": determine_effective_role(user_type, is_admin, staff_type),
        "is_admin": is_admin,
        "staff_type": staff_type,
        "staff_id": staff_id,
        "student_id": student_id,
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



async def get_current_user(
    token: str = Depends(oauth2_scheme),
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

    return {
        "id": user_id,
        "role": role,
        "user_type": user_type,
        "is_admin": bool(payload.get("is_admin", False)),
        "staff_type": payload.get("staff_type"),
        "staff_id": payload.get("staff_id"),
        "student_id": payload.get("student_id"),
    }
