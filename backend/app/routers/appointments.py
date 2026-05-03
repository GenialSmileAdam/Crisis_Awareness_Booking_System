from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.dependencies import cache_idempotent_response, handle_idempotency, require_roles
from app.schemas.appointments import (
    AppointmentCreate,
    AppointmentUpdate,
    StudentAppointmentCreate,
)
from app.services.appointment_service import AppointmentService
from app.utils.response import success


router = APIRouter(prefix="/appointments", tags=["appointments"])


def _serialize_appointment(appointment) -> dict:
    return {
        "id": appointment.id,
        "student_id": appointment.student_id,
        "psychologist_id": appointment.psychologist_id,
        "start_time": appointment.start_time,
        "end_time": appointment.end_time,
        "status": appointment.status,
        "is_crisis": appointment.is_crisis,
        "crisis_note": appointment.crisis_note,
        "booking_source": appointment.booking_source,
        "calendar_event_id": appointment.calendar_event_id,
        "deleted_at": appointment.deleted_at,
        "created_at": appointment.created_at,
    }


@router.post("", status_code=201)
async def create_appointment(
    payload: AppointmentCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("psychologist", "admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        result = await AppointmentService.create(db, payload, background_tasks, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    response = success("Appointment created successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.post("/book")
async def book_student_appointment(
    payload: StudentAppointmentCreate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("student"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        appointment = await AppointmentService.book_student_appointment(
            db,
            current_user,
            payload,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    response = success(
        "Appointment booked successfully",
        _serialize_appointment(appointment),
    )
    return cache_idempotent_response(cache_key, response)


@router.get("")
async def list_appointments(
    psychologist_id: UUID | None = None,
    student_id: str | None = None,
    status: str | None = None,
    is_crisis: bool | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("psychologist", "admin"),
):
    result = await AppointmentService.get_all(
        db,
        {
            "psychologist_id": psychologist_id,
            "student_id": student_id,
            "status": status,
            "is_crisis": is_crisis,
            "start_date": datetime.combine(start_date, time.min) if start_date else None,
            "end_date": datetime.combine(end_date, time.max) if end_date else None,
        },
        limit,
        offset,
        current_user=current_user,
    )
    return success("Appointments retrieved successfully", result)


@router.get("/availability/{psychologist_id}")
async def get_appointment_availability(
    psychologist_id: UUID,
    date: date,
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin", "psychologist", "staff", "student"),
):
    try:
        result = await AppointmentService.get_availability(db, psychologist_id, date)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Availability retrieved successfully", result)


@router.get("/{id}")
async def get_appointment(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("psychologist", "admin"),
):
    try:
        result = await AppointmentService.get_by_id(db, id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success("Appointment retrieved successfully", result)


@router.patch("/{id}")
async def update_appointment(
    id: UUID,
    payload: AppointmentUpdate,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("psychologist", "admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        result = await AppointmentService.update(db, id, payload, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    response = success("Appointment updated successfully", result)
    return cache_idempotent_response(cache_key, response)


@router.delete("/{id}")
async def delete_appointment(
    id: UUID,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin"),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached
    try:
        await AppointmentService.soft_delete(db, id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    response = success("Appointment deleted successfully", None)
    return cache_idempotent_response(cache_key, response)
