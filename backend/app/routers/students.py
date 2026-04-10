from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.dependencies import cache_idempotent_response, handle_idempotency, require_roles
from app.schemas.students import StudentUpdate
from app.services.student_service import StudentService
from app.utils.response import success


router = APIRouter(prefix="/students", tags=["students"])


@router.post("/upload-csv")
async def upload_students_csv(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin", "psychologist"),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    contents = await file.read()
    try:
        result = await StudentService.bulk_import_csv(db, contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    response = success("Students imported successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.get("")
async def list_students(
    student_id: str | None = None,
    class_level: str | None = None,
    crisis_flag: bool | None = None,
    assigned_psychologist_id: UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    result = await StudentService.get_all(
        db,
        {
            "student_id_query": student_id,
            "class_level": class_level,
            "crisis_flag": crisis_flag,
            "assigned_psychologist_id": assigned_psychologist_id,
        },
        limit,
        offset,
        current_user=current_user,
    )
    return success("Students retrieved successfully", result)


@router.get("/search")
async def search_students_by_student_id(
    q: str = Query(..., min_length=1, description="Student ID search query"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    try:
        result = await StudentService.search_by_student_id(db, q, limit, offset, current_user=current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return success("Students retrieved successfully", result)


@router.get("/{id}")
async def get_student(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    try:
        result = await StudentService.get_by_id(db, id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Student retrieved successfully", result)


@router.patch("/{id}")
async def update_student(
    id: str,
    payload: StudentUpdate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        result = await StudentService.update(db, id, payload, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    response = success("Student updated successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.delete("/{id}")
async def delete_student(
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
        await StudentService.soft_delete(db, id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    response = success("Student deleted successfully", None)
    return cache_idempotent_response(cache_key, response)


@router.get("/{id}/sessions")
async def get_student_sessions(
    id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    try:
        result = await StudentService.get_sessions(db, id, limit, offset, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Student sessions retrieved successfully", result)


@router.get("/{id}/crisis-logs")
async def get_student_crisis_logs(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    try:
        result = await StudentService.get_crisis_logs(db, id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Student crisis logs retrieved successfully", result)
