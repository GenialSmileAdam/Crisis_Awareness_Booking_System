from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.dependencies import cache_idempotent_response, handle_idempotency, require_roles
from app.schemas.forum_posts import ForumPostCreate, ForumPostDelete
from app.services.forum_service import ForumService
from app.utils.response import success


router = APIRouter(prefix="/forum", tags=["forum"])


@router.get("/posts")
async def list_forum_posts(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    include_deleted: bool = Query(default=False),
    search: str | None = Query(default=None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("student", "staff", "admin"),
):
    can_view_deleted = current_user.get("is_admin") or current_user.get("user_type") == "staff"
    if include_deleted and not can_view_deleted:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    result = await ForumService.list_posts(
        db,
        limit=limit,
        offset=offset,
        include_deleted=include_deleted,
        search=search,
    )
    return success("Forum posts retrieved successfully", result)


@router.post("/posts", status_code=201)
async def create_forum_post(
    payload: ForumPostCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("student"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    try:
        result = await ForumService.create_post(
            db,
            payload=payload,
            current_user=current_user,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = success("Forum post created successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.delete("/posts/{post_id}")
async def delete_forum_post(
    post_id: UUID,
    payload: ForumPostDelete,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("staff", "admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    try:
        await ForumService.soft_delete(db, post_id=post_id, reason=payload.reason)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    response = success("Forum post removed successfully", None)
    return cache_idempotent_response(cache_key, response)
