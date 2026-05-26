from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.psychologist_availability import PsychologistAvailability, PsychologistBusyBlock
from app.models.staff import Staff
from app.utils.response import success

router = APIRouter(prefix="/availability", tags=["Availability"])


def _require_psychologist(current_user: dict) -> None:
    if current_user["role"] not in {"psychologist", "admin"}:
        raise HTTPException(status_code=403, detail="Psychologists only")


async def _get_staff_user_id(db: AsyncSession, current_user: dict) -> UUID:
    """Resolve current user's UUID → staff.user_id (they are the same for staff)."""
    user_id = current_user["id"]
    staff = (await db.execute(
        select(Staff.user_id).where(Staff.user_id == user_id)
    )).scalar_one_or_none()
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff record not found")
    return user_id


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DaySchedule(BaseModel):
    day_of_week: int   # 0=Mon … 6=Sun
    start_time: str    # "HH:MM"
    end_time: str      # "HH:MM"
    is_available: bool = True

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be 0–6")
        return v


class WeeklySchedulePayload(BaseModel):
    schedule: list[DaySchedule]


class BusyBlockPayload(BaseModel):
    block_start: datetime
    block_end: datetime
    reason: str | None = None

    @field_validator("block_end")
    @classmethod
    def end_after_start(cls, v: datetime, info: any) -> datetime:
        start = info.data.get("block_start")
        if start and v <= start:
            raise ValueError("block_end must be after block_start")
        return v


# ── Weekly schedule endpoints ─────────────────────────────────────────────────

@router.get("/me")
async def get_my_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return current psychologist's weekly availability schedule."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    rows = (await db.execute(
        select(PsychologistAvailability)
        .where(PsychologistAvailability.psychologist_id == psych_id)
        .order_by(PsychologistAvailability.day_of_week)
    )).scalars().all()

    return success("Schedule retrieved", [
        {
            "id": str(r.id),
            "day_of_week": r.day_of_week,
            "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
            "is_available": r.is_available,
        }
        for r in rows
    ])


@router.put("/me")
async def set_my_schedule(
    payload: WeeklySchedulePayload,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Replace entire weekly availability schedule (full upsert)."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

    # Delete all existing rows for this psychologist, then re-insert
    await db.execute(
        delete(PsychologistAvailability).where(
            PsychologistAvailability.psychologist_id == psych_id
        )
    )

    for day in payload.schedule:
        from datetime import time as dtime
        h_start, m_start = map(int, day.start_time.split(":"))
        h_end, m_end = map(int, day.end_time.split(":"))
        db.add(PsychologistAvailability(
            psychologist_id=psych_id,
            day_of_week=day.day_of_week,
            start_time=dtime(h_start, m_start),
            end_time=dtime(h_end, m_end),
            is_available=day.is_available,
        ))

    await db.commit()
    return success("Schedule updated", {"days": len(payload.schedule)})


# ── Busy blocks endpoints ─────────────────────────────────────────────────────

@router.get("/busy-blocks")
async def get_busy_blocks(
    include_past: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return upcoming (or all) one-off busy blocks for this psychologist."""
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
    """Add a one-off busy period."""
    _require_psychologist(current_user)
    psych_id = await _get_staff_user_id(db, current_user)

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
    """Remove a busy block (must belong to the requesting psychologist)."""
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
