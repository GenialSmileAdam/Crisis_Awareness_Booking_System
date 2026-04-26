from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.students import Student
from app.models.wellness_checkins import WellnessCheckin, WellnessCheckinType
from app.utils.pagination import paginate
from app.utils.response import success


router = APIRouter()


class CheckinSubmit(BaseModel):
    type: WellnessCheckinType
    responses: dict[str, Any]


def _score_checkin(
    checkin_type: WellnessCheckinType, responses: dict[str, int]
) -> tuple[int | None, str | None]:
    if checkin_type not in {WellnessCheckinType.phq9, WellnessCheckinType.gad7}:
        return None, None

    score = sum(responses.values())

    if checkin_type == WellnessCheckinType.phq9:
        if score <= 4:
            return score, "Minimal"
        if score <= 9:
            return score, "Mild"
        if score <= 14:
            return score, "Moderate"
        if score <= 19:
            return score, "Moderately Severe"
        return score, "Severe"

    if score <= 4:
        return score, "Minimal"
    if score <= 9:
        return score, "Mild"
    if score <= 14:
        return score, "Moderate"
    return score, "Severe"


def _serialize_checkin(checkin: WellnessCheckin) -> dict[str, Any]:
    return {
        "id": str(checkin.id),
        "student_id": checkin.student_id,
        "type": checkin.type.value,
        "responses": checkin.responses,
        "score": checkin.score,
        "severity_label": checkin.severity_label,
        "submitted_at": checkin.submitted_at.isoformat(),
    }


def _current_week_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
    end = start + timedelta(days=7)
    return start, end


def _current_month_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


from datetime import timedelta


@router.post("")
async def submit_checkin(
    payload: CheckinSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    student_id = current_user.get("student_id")
    score, severity_label = _score_checkin(payload.type, payload.responses)

    checkin = WellnessCheckin(
        student_id=student_id,
        type=payload.type,
        responses=payload.responses,
        score=score,
        severity_label=severity_label,
    )
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)

    response_data = _serialize_checkin(checkin)
    response_data["crisis_escalation_required"] = payload.type == WellnessCheckinType.crisis
    return success("Check-in submitted successfully", response_data)


@router.get("/student/{student_id}")
async def get_student_checkins(
    student_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    role = current_user["role"]
    if role not in {"admin", "psychologist", "student"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if role == "student" and current_user.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    student_exists = await db.execute(select(Student.student_id).where(Student.student_id == student_id))
    if student_exists.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Student not found")

    total = (
        await db.execute(
            select(func.count()).select_from(
                select(WellnessCheckin.id)
                .where(WellnessCheckin.student_id == student_id)
                .subquery()
            )
        )
    ).scalar_one()

    rows = (
        await db.execute(
            select(WellnessCheckin)
            .where(WellnessCheckin.student_id == student_id)
            .order_by(WellnessCheckin.submitted_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()

    result = paginate(
        data=[_serialize_checkin(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
    return success("Check-ins retrieved successfully", result)


@router.get("/pending")
async def get_pending_checkins(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    student_id = current_user.get("student_id")
    now = datetime.now(timezone.utc)
    week_start, week_end = _current_week_bounds(now)
    month_start, month_end = _current_month_bounds(now)

    pulse_exists = (
        await db.execute(
            select(WellnessCheckin.id).where(
                WellnessCheckin.student_id == student_id,
                WellnessCheckin.type == WellnessCheckinType.pulse,
                WellnessCheckin.submitted_at >= week_start,
                WellnessCheckin.submitted_at < week_end,
            )
        )
    ).first() is not None

    phq9_exists = (
        await db.execute(
            select(WellnessCheckin.id).where(
                WellnessCheckin.student_id == student_id,
                WellnessCheckin.type == WellnessCheckinType.phq9,
                WellnessCheckin.submitted_at >= month_start,
                WellnessCheckin.submitted_at < month_end,
            )
        )
    ).first() is not None

    gad7_exists = (
        await db.execute(
            select(WellnessCheckin.id).where(
                WellnessCheckin.student_id == student_id,
                WellnessCheckin.type == WellnessCheckinType.gad7,
                WellnessCheckin.submitted_at >= month_start,
                WellnessCheckin.submitted_at < month_end,
            )
        )
    ).first() is not None

    pending: list[dict[str, str]] = []
    if not pulse_exists:
        pending.append(
            {
                "type": WellnessCheckinType.pulse.value,
                "message": "Weekly pulse check-in is pending for the current week.",
            }
        )
    if not phq9_exists:
        pending.append(
            {
                "type": WellnessCheckinType.phq9.value,
                "message": "Monthly PHQ-9 check-in is pending for the current month.",
            }
        )
    if not gad7_exists:
        pending.append(
            {
                "type": WellnessCheckinType.gad7.value,
                "message": "Monthly GAD-7 check-in is pending for the current month.",
            }
        )

    return success("Pending check-ins retrieved successfully", pending)
