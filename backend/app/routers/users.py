from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.users import PasswordChange, UserCreate, UserUpdate
from app.services.user_service import UserService
from app.utils.response import success
from app.routers.dependencies import handle_idempotency, cache_idempotent_response

router = APIRouter(prefix="/users", tags=["users"])


def require_admin(current_user: dict) -> None:
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )


def allow_admin_or_self(current_user: dict, target_id: UUID) -> None:
    if current_user.get("is_admin"):
        return
    if current_user.get("id") == target_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
    )


@router.post("")
async def create_user(
    request: Request,
    payload: UserCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_admin(current_user)
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    result = await UserService.create(db, payload)
    body = success("User created", result)
    return cache_idempotent_response(cache_key, body)


@router.get("")
async def list_users(
    user_type: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    limit: int = 20,
    offset: int = 0,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_admin(current_user)

    filters = {"user_type": user_type, "is_active": is_active}
    result = await UserService.get_all(db, filters, limit, offset)
    return success("Users fetched", result)


@router.get("/{user_id}")
async def get_user(
    user_id: UUID,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    allow_admin_or_self(current_user, user_id)
    result = await UserService.get_by_id(db, user_id)
    return success("User fetched", result)


@router.patch("/{user_id}")
async def update_user(
    request: Request,
    user_id: UUID,
    payload: UserUpdate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    allow_admin_or_self(current_user, user_id)
    if payload.is_admin is not None and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change admin privileges",
        )
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    result = await UserService.update(db, user_id, payload)
    body = success("User updated", result)
    return cache_idempotent_response(cache_key, body)


@router.patch("/{user_id}/password")
async def change_password(
    request: Request,
    user_id: UUID,
    payload: PasswordChange,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    allow_admin_or_self(current_user, user_id)
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    skip_verification = current_user.get("is_admin") and current_user.get("id") != user_id
    if not skip_verification and not payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password required",
        )

    await UserService.change_password(db, user_id, payload, skip_verification=skip_verification)
    body = success("Password updated")
    return cache_idempotent_response(cache_key, body)
