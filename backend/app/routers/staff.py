from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.routers.dependencies import cache_idempotent_response, handle_idempotency, require_roles
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services.staff_service import StaffService
from app.utils.response import success


router = APIRouter(tags=["staff"])


@router.post("/staff")
async def create_staff(
    payload: StaffCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        result = await StaffService.create(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    response = success("Staff created successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.get("/staff")
async def list_staff(
    staff_type: str | None = None,
    department: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin"),
):
    result = await StaffService.get_all(db, {"staff_type": staff_type, "department": department}, limit, offset)
    return success("Staff retrieved successfully", result)


@router.get("/psychologists")
async def list_psychologists(
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin", "staff"),
):
    result = await StaffService.get_psychologists(db)
    return success("Psychologists retrieved successfully", result)


@router.get("/staff/{id}")
async def get_staff(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("is_admin") and current_user.get("staff_id") != id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        result = await StaffService.get_by_id(db, id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Staff retrieved successfully", result)


@router.patch("/staff/{id}")
async def update_staff(
    id: str,
    payload: StaffUpdate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("is_admin") and current_user.get("staff_id") != id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if payload.is_admin is not None and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Only admins can change admin privileges")
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        result = await StaffService.update(db, id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    response = success("Staff updated successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.delete("/staff/{id}")
async def delete_staff(
    id: str,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        await StaffService.soft_delete(db, id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    response = success("Staff deleted successfully", None)
    return cache_idempotent_response(cache_key, response)
