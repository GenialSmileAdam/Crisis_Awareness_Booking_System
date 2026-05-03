from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.risk_overrides import RiskOverride
from app.models.risk_scores import RiskScore, RiskTier
from app.models.staff import Staff
from app.models.students import Student
from app.models.tables import users_table
from app.utils.pagination import paginate
from app.utils.response import success


router = APIRouter()


class RiskOverrideSubmit(BaseModel):
    override_tier: RiskTier
    justification: str


def _serialize_risk_score(risk_score: RiskScore) -> dict:
    return {
        "id": str(risk_score.id),
        "student_id": risk_score.student_id,
        "wrs_score": risk_score.wrs_score,
        "tier": risk_score.tier.value,
        "computed_at": risk_score.computed_at.isoformat(),
    }


def _serialize_risk_override(risk_override: RiskOverride) -> dict:
    return {
        "id": str(risk_override.id),
        "student_id": risk_override.student_id,
        "psychologist_id": str(risk_override.psychologist_id),
        "override_tier": risk_override.override_tier.value,
        "justification": risk_override.justification,
        "created_at": risk_override.created_at.isoformat(),
    }


def _require_admin_or_psychologist(current_user: dict) -> None:
    if current_user["role"] not in {"admin", "psychologist"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


async def _get_student_or_404(db: AsyncSession, student_id: str) -> None:
    result = await db.execute(
        select(Student.student_id).where(Student.student_id == student_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Student not found")


@router.get("/cohort")
async def get_risk_score_cohort(
    group_by: str = Query(default="department"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin_or_psychologist(current_user)
    if group_by not in {"department", "year_group"}:
        raise HTTPException(
            status_code=400,
            detail="group_by must be 'department' or 'year_group'",
        )

    latest_scores = (
        select(
            RiskScore.student_id.label("student_id"),
            func.max(RiskScore.computed_at).label("latest_computed_at"),
        )
        .group_by(RiskScore.student_id)
        .subquery()
    )

    group_expr = func.coalesce(Student.class_level, "Unknown")

    rows = (
        await db.execute(
            select(
                group_expr.label("group"),
                func.sum(
                    case((RiskScore.tier == RiskTier.green, 1), else_=0)
                ).label("green"),
                func.sum(
                    case((RiskScore.tier == RiskTier.amber, 1), else_=0)
                ).label("amber"),
                func.sum(
                    case((RiskScore.tier == RiskTier.red, 1), else_=0)
                ).label("red"),
                func.sum(
                    case((RiskScore.tier == RiskTier.critical, 1), else_=0)
                ).label("critical"),
                func.avg(RiskScore.wrs_score).label("average_wrs_score"),
            )
            .join(
                latest_scores,
                (latest_scores.c.student_id == RiskScore.student_id)
                & (latest_scores.c.latest_computed_at == RiskScore.computed_at),
            )
            .join(Student, Student.student_id == RiskScore.student_id)
            .group_by(group_expr)
            .order_by(func.avg(RiskScore.wrs_score).desc())
        )
    ).all()

    data = [
        {
            "group": row.group,
            "green": row.green,
            "amber": row.amber,
            "red": row.red,
            "critical": row.critical,
            "average_wrs_score": float(row.average_wrs_score or 0),
        }
        for row in rows
    ]
    return success("Risk score cohort retrieved successfully", data)


@router.get("/alerts")
async def get_risk_score_alerts(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin_or_psychologist(current_user)

    latest_scores = (
        select(
            RiskScore.student_id.label("student_id"),
            func.max(RiskScore.computed_at).label("latest_computed_at"),
        )
        .group_by(RiskScore.student_id)
        .subquery()
    )

    base_query = (
        select(
            RiskScore.student_id,
            users_table.c.full_name,
            RiskScore.wrs_score,
            RiskScore.tier,
            RiskScore.computed_at,
        )
        .join(
            latest_scores,
            (latest_scores.c.student_id == RiskScore.student_id)
            & (latest_scores.c.latest_computed_at == RiskScore.computed_at),
        )
        .join(Student, Student.student_id == RiskScore.student_id)
        .join(users_table, users_table.c.id == Student.user_id)
        .where(
            RiskScore.tier.in_(
                [RiskTier.amber, RiskTier.red, RiskTier.critical]
            ),
            users_table.c.deleted_at.is_(None),
        )
    )

    total = (
        await db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
    ).scalar_one()

    rows = (
        await db.execute(
            base_query.order_by(RiskScore.wrs_score.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    data = [
        {
            "student_id": row.student_id,
            "full_name": row.full_name,
            "wrs_score": row.wrs_score,
            "tier": row.tier.value,
            "computed_at": row.computed_at.isoformat(),
        }
        for row in rows
    ]
    return success(
        "Risk score alerts retrieved successfully",
        paginate(data=data, total=total, limit=limit, offset=offset),
    )


@router.post("/override/{student_id}")
async def create_risk_override(
    student_id: str,
    payload: RiskOverrideSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin_or_psychologist(current_user)
    if not payload.justification or not payload.justification.strip():
        raise HTTPException(status_code=400, detail="justification is required")

    await _get_student_or_404(db, student_id)

    staff_id = current_user.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    staff_user_id = (
        await db.execute(select(Staff.user_id).where(Staff.staff_id == staff_id))
    ).scalar_one_or_none()
    if staff_user_id is None:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    override = RiskOverride(
        student_id=student_id,
        psychologist_id=staff_user_id,
        override_tier=payload.override_tier,
        justification=payload.justification.strip(),
    )
    db.add(override)
    await db.commit()
    await db.refresh(override)

    return success(
        "Risk override created successfully",
        _serialize_risk_override(override),
    )


@router.get("/{student_id}")
async def get_student_risk_score(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin_or_psychologist(current_user)
    await _get_student_or_404(db, student_id)

    current_score = (
        await db.execute(
            select(RiskScore)
            .where(RiskScore.student_id == student_id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if current_score is None:
        raise HTTPException(status_code=404, detail="Risk score not found")

    window_start = datetime.now(timezone.utc) - timedelta(days=30)
    trend = (
        await db.execute(
            select(RiskScore)
            .where(
                RiskScore.student_id == student_id,
                RiskScore.computed_at >= window_start,
            )
            .order_by(RiskScore.computed_at.asc())
        )
    ).scalars().all()

    override = (
        await db.execute(
            select(RiskOverride)
            .where(RiskOverride.student_id == student_id)
            .order_by(RiskOverride.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    return success(
        "Risk score retrieved successfully",
        {
            "current": _serialize_risk_score(current_score),
            "trend": [_serialize_risk_score(row) for row in trend],
            "override": _serialize_risk_override(override) if override else None,
        },
    )
