from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.psychologist_availability import PsychologistAvailability, PsychologistBusyBlock, PsychologistWeeklySchedule
from app.models.staff import Staff
from app.services.scheduling_service import (
    check_availability_conflicts_busy_block,
    check_availability_overlap,
    check_busy_block_conflict,
)
from app.utils.response import success

router = APIRouter(prefix="/availability", tags=["Availability"])


def _require_psychologist(current_user: dict) -> None:
    # Check if user has psychologist or unit_head role in Campus One roles
    user_roles = current_user.get("roles", [])
    if "psychologist" not in user_roles and "unit_head" not in user_roles:
        raise HTTPException(status_code=403, detail="Psychologists only")


async def _get_staff_user_id(db: AsyncSession, current_user: dict) -> UUID:
    user_id = current_user["id"]
    staff = (await db.execute(
        select(Staff.user_id).where(Staff.user_id == user_id)
    )).scalar_one_or_none()
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff record not found")
    return user_id


def _parse_time(value: str) -> time:
    try:
        hours, minutes = map(int, value.split(":"))
        return time(hour=hours, minute=minutes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Time must be formatted as HH:MM") from exc


def _validate_availability_range(start_time: time, end_time: time) -> None:
    if end_time <= start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")
    for moment in (start_time, end_time):
        if moment.second != 0 or moment.microsecond != 0 or moment.minute % 15 != 0:
            raise HTTPException(status_code=422, detail="Times must use 15-minute increments")


class AvailabilityBlockPayload(BaseModel):
    date: date
    start_time: str
    end_time: str


class AvailabilityBlockUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class BusyBlockPayload(BaseModel):
    block_start: datetime
    block_end: datetime
    reason: Optional[str] = None

    @field_validator("block_end")
    def validate_block_times(cls, block_end, info):
        block_start = info.data.get("block_start")
        if block_start is not None and block_end <= block_start:
            raise ValueError("block_end must be after block_start")
        return block_end


class DaySchedule(BaseModel):
    day: str  # Monday, Tuesday, etc.
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format


class SchedulePayload(BaseModel):
    schedule: list[DaySchedule]


@router.post("")
async def create_availability(
    payload: AvailabilityBlockPayload,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    target_id = await _get_staff_user_id(db, current_user)

    start_time = _parse_time(payload.start_time)
    end_time = _parse_time(payload.end_time)
    _validate_availability_range(start_time, end_time)

    overlap = await check_availability_overlap(
        db,
        target_id,
        payload.date,
        start_time,
        end_time,
    )

    if overlap:
        raise HTTPException(status_code=409, detail="Availability overlaps an existing block")

    busy_conflict = await check_busy_block_conflict(
        db,
        target_id,
        datetime.combine(payload.date, start_time, timezone.utc),
        datetime.combine(payload.date, end_time, timezone.utc),
    )
    if busy_conflict:
        raise HTTPException(status_code=409, detail="Availability overlaps an existing busy block")

    block = PsychologistAvailability(
        psychologist_id=target_id,
        date=payload.date,
        start_time=start_time,
        end_time=end_time,
    )
    db.add(block)
    await db.commit()
    await db.refresh(block)

    return success("Availability block created", {
        "id": str(block.id),
        "psychologist_id": str(block.psychologist_id),
        "date": block.date.isoformat(),
        "start_time": block.start_time.strftime("%H:%M"),
        "end_time": block.end_time.strftime("%H:%M"),
        "status": "available",
    })


@router.get("/me")
async def get_my_availability(
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the current psychologist's own availability blocks."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    query = select(PsychologistAvailability).where(
        PsychologistAvailability.psychologist_id == psych_id
    )
    if start_date:
        query = query.where(PsychologistAvailability.date >= start_date)
    if end_date:
        query = query.where(PsychologistAvailability.date <= end_date)

    rows = (
        await db.execute(
            query.order_by(
                PsychologistAvailability.date.asc(),
                PsychologistAvailability.start_time.asc(),
            )
        )
    ).scalars().all()

    return success("My availability retrieved", [
        {
            "id": str(row.id),
            "date": row.date.isoformat(),
            "start_time": row.start_time.strftime("%H:%M"),
            "end_time": row.end_time.strftime("%H:%M"),
            "status": "available",
        }
        for row in rows
    ])


@router.get("")
async def list_availability(
    psychologist_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(PsychologistAvailability)
    if psychologist_id:
        query = query.where(PsychologistAvailability.psychologist_id == psychologist_id)
    if start_date:
        query = query.where(PsychologistAvailability.date >= start_date)
    if end_date:
        query = query.where(PsychologistAvailability.date <= end_date)

    rows = (
        await db.execute(
            query.order_by(
                PsychologistAvailability.date.asc(),
                PsychologistAvailability.start_time.asc(),
            )
        )
    ).scalars().all()

    return success("Availability retrieved", [
        {
            "id": str(row.id),
            "psychologist_id": str(row.psychologist_id),
            "date": row.date.isoformat(),
            "start_time": row.start_time.strftime("%H:%M"),
            "end_time": row.end_time.strftime("%H:%M"),
            "status": "available",
        }
        for row in rows
    ])


@router.put("/{availability_id}")
async def update_availability(
    availability_id: UUID,
    payload: AvailabilityBlockUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    block = (
        await db.execute(
            select(PsychologistAvailability).where(PsychologistAvailability.id == availability_id)
        )
    ).scalar_one_or_none()
    if block is None:
        raise HTTPException(status_code=404, detail="Availability block not found")

    if block.psychologist_id != psych_id:
        raise HTTPException(status_code=403, detail="Not allowed to update this availability")

    new_date = payload.date or block.date
    new_start = _parse_time(payload.start_time) if payload.start_time else block.start_time
    new_end = _parse_time(payload.end_time) if payload.end_time else block.end_time
    _validate_availability_range(new_start, new_end)

    overlap = await check_availability_overlap(
        db,
        block.psychologist_id,
        new_date,
        new_start,
        new_end,
        exclude_id=availability_id,
    )
    if overlap:
        raise HTTPException(status_code=409, detail="Updated availability overlaps another block")

    busy_conflict = await check_busy_block_conflict(
        db,
        block.psychologist_id,
        datetime.combine(new_date, new_start, timezone.utc),
        datetime.combine(new_date, new_end, timezone.utc),
    )
    if busy_conflict:
        raise HTTPException(status_code=409, detail="Updated availability overlaps an existing busy block")

    block.date = new_date
    block.start_time = new_start
    block.end_time = new_end
    await db.commit()
    await db.refresh(block)

    updated_block = block

    return success("Availability block updated", {
        "id": str(updated_block.id),
        "psychologist_id": str(updated_block.psychologist_id),
        "date": updated_block.date.isoformat(),
        "start_time": updated_block.start_time.strftime("%H:%M"),
        "end_time": updated_block.end_time.strftime("%H:%M"),
        "status": "available",
    })


@router.delete("/{availability_id}")
async def delete_availability(
    availability_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    block = (
        await db.execute(
            select(PsychologistAvailability).where(PsychologistAvailability.id == availability_id)
        )
    ).scalar_one_or_none()
    if block is None:
        raise HTTPException(status_code=404, detail="Availability block not found")

    if block.psychologist_id != psych_id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this availability")

    await db.delete(block)
    await db.commit()
    return success("Availability block deleted", {"id": str(availability_id)})


DAY_MAP = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6,
}
DAY_MAP_INV = {v: k for k, v in DAY_MAP.items()}


@router.get("/weekly")
async def get_weekly_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the current psychologist's recurring weekly schedule."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    rows = (
        await db.execute(
            select(PsychologistWeeklySchedule)
            .where(PsychologistWeeklySchedule.psychologist_id == psych_id)
            .order_by(PsychologistWeeklySchedule.day_of_week, PsychologistWeeklySchedule.start_time)
        )
    ).scalars().all()

    return success("Weekly schedule retrieved", [
        {
            "id": str(r.id),
            "day_of_week": r.day_of_week,
            "day_name": DAY_MAP_INV.get(r.day_of_week, "Unknown"),
            "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
        }
        for r in rows
    ])


@router.post("/schedule")
async def save_weekly_schedule(
    payload: SchedulePayload,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Save a recurring weekly schedule. Persists to weekly_schedule table (permanent)
    and also creates date-specific blocks for the next 26 weeks."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    today = datetime.now(timezone.utc).date()

    for day_schedule in payload.schedule:
        day_name = day_schedule.day
        if day_name not in DAY_MAP:
            raise HTTPException(status_code=422, detail=f"Invalid day: {day_name}")

        start_time = _parse_time(day_schedule.start_time)
        end_time = _parse_time(day_schedule.end_time)
        _validate_availability_range(start_time, end_time)

        target_weekday = DAY_MAP[day_name]

        # Upsert: delete existing row for this day and replace
        await db.execute(
            PsychologistWeeklySchedule.__table__.delete().where(
                PsychologistWeeklySchedule.psychologist_id == psych_id,
                PsychologistWeeklySchedule.day_of_week == target_weekday,
            )
        )
        db.add(PsychologistWeeklySchedule(
            psychologist_id=psych_id,
            day_of_week=target_weekday,
            start_time=start_time,
            end_time=end_time,
        ))

    # Also materialise date-specific blocks for the next 26 weeks (convenience)
    created_blocks = []
    for week in range(26):
        for day_schedule in payload.schedule:
            day_name = day_schedule.day
            target_weekday = DAY_MAP[day_name]
            start_time = _parse_time(day_schedule.start_time)
            end_time = _parse_time(day_schedule.end_time)

            days_ahead = target_weekday - today.weekday()
            if days_ahead < 0:
                days_ahead += 7
            if week > 0:
                days_ahead += week * 7

            block_date = today + timedelta(days=days_ahead)

            overlap = await check_availability_overlap(db, psych_id, block_date, start_time, end_time)
            if overlap:
                continue

            db.add(PsychologistAvailability(
                psychologist_id=psych_id,
                date=block_date,
                start_time=start_time,
                end_time=end_time,
            ))
            created_blocks.append(block_date.isoformat())

    await db.commit()
    return success("Weekly schedule saved", {
        "blocks_created": len(created_blocks),
    })


# ── Busy blocks endpoints ─────────────────────────────────────────────────────

@router.get("/busy-blocks")
async def get_busy_blocks(
    include_past: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    q = select(PsychologistBusyBlock).where(
        PsychologistBusyBlock.psychologist_id == psych_id
    )
    if not include_past:
        q = q.where(PsychologistBusyBlock.block_end >= datetime.now(timezone.utc))
    q = q.order_by(PsychologistBusyBlock.block_start)

    rows = (await db.execute(q)).scalars().all()

    return success("Busy blocks retrieved", [
        {
            "id": str(r.id),
            "block_start": r.block_start.isoformat(),
            "block_end": r.block_end.isoformat(),
            "reason": r.reason,
        }
        for r in rows
    ])


@router.post("/busy-blocks")
async def add_busy_block(
    payload: BusyBlockPayload,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    conflict = await check_busy_block_conflict(
        db,
        psych_id,
        payload.block_start,
        payload.block_end,
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Busy block overlaps an existing busy block")

    availability_conflict = await check_availability_conflicts_busy_block(
        db,
        psych_id,
        payload.block_start,
        payload.block_end,
    )
    if availability_conflict:
        raise HTTPException(status_code=409, detail="Busy block overlaps existing availability")

    block = PsychologistBusyBlock(
        psychologist_id=psych_id,
        block_start=payload.block_start,
        block_end=payload.block_end,
        reason=payload.reason,
    )
    db.add(block)
    await db.commit()
    await db.refresh(block)

    return success("Busy block added", {
        "id": str(block.id),
        "block_start": block.block_start.isoformat(),
        "block_end": block.block_end.isoformat(),
        "reason": block.reason,
    })


@router.delete("/busy-blocks/{block_id}")
async def delete_busy_block(
    block_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    block = (await db.execute(
        select(PsychologistBusyBlock).where(
            PsychologistBusyBlock.id == block_id,
            PsychologistBusyBlock.psychologist_id == psych_id,
        )
    )).scalar_one_or_none()

    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    await db.delete(block)
    await db.commit()
    return success("Busy block removed", {"id": str(block_id)})
