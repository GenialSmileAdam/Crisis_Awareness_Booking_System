"""
Clinical toolkit service: care plans, safety plans, session action items, and
referrals. Used by counsellors during and after a session. All persistence is
keyed off the student (and, for action items, the session) so the data is always
reachable from the student profile or a past-session review.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clinical import CarePlan, SafetyPlan, SessionActionItem, Referral


def _uuid(value: Any) -> Optional[uuid.UUID]:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


def _parse_date(value: Any) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        try:
            return datetime.strptime(str(value), "%Y-%m-%d").date()
        except ValueError:
            return None


# ── Care plans ────────────────────────────────────────────────────────────────
def _serialize_care_plan(p: CarePlan) -> dict:
    return {
        "id": str(p.id),
        "student_id": p.student_id,
        "author_id": str(p.author_id) if p.author_id else None,
        "title": p.title,
        "goals": p.goals or [],
        "status": p.status,
        "review_date": p.review_date.isoformat() if p.review_date else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


async def list_care_plans(db: AsyncSession, student_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(CarePlan).where(CarePlan.student_id == student_id).order_by(CarePlan.created_at.desc())
        )
    ).scalars().all()
    return [_serialize_care_plan(p) for p in rows]


async def create_care_plan(db: AsyncSession, student_id: str, data: dict, author_id: Any) -> dict:
    plan = CarePlan(
        student_id=student_id,
        author_id=_uuid(author_id),
        title=data["title"],
        goals=data.get("goals") or [],
        status=data.get("status", "active"),
        review_date=_parse_date(data.get("review_date")),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return _serialize_care_plan(plan)


async def update_care_plan(db: AsyncSession, plan_id: str, data: dict) -> Optional[dict]:
    plan = await db.get(CarePlan, _uuid(plan_id))
    if not plan:
        return None
    if "title" in data:
        plan.title = data["title"]
    if "goals" in data:
        plan.goals = data["goals"] or []
    if "status" in data:
        plan.status = data["status"]
    if "review_date" in data:
        plan.review_date = _parse_date(data.get("review_date"))
    await db.commit()
    await db.refresh(plan)
    return _serialize_care_plan(plan)


# ── Safety plan (one per student, upsert) ─────────────────────────────────────
def _serialize_safety_plan(p: SafetyPlan) -> dict:
    return {
        "id": str(p.id),
        "student_id": p.student_id,
        "warning_signs": p.warning_signs,
        "coping_strategies": p.coping_strategies,
        "reasons_to_live": p.reasons_to_live,
        "support_contacts": p.support_contacts or [],
        "updated_by": str(p.updated_by) if p.updated_by else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


async def get_safety_plan(db: AsyncSession, student_id: str) -> Optional[dict]:
    plan = (
        await db.execute(select(SafetyPlan).where(SafetyPlan.student_id == student_id))
    ).scalar_one_or_none()
    return _serialize_safety_plan(plan) if plan else None


async def upsert_safety_plan(db: AsyncSession, student_id: str, data: dict, updated_by: Any) -> dict:
    plan = (
        await db.execute(select(SafetyPlan).where(SafetyPlan.student_id == student_id))
    ).scalar_one_or_none()
    if plan is None:
        plan = SafetyPlan(student_id=student_id)
        db.add(plan)
    plan.warning_signs = data.get("warning_signs", plan.warning_signs)
    plan.coping_strategies = data.get("coping_strategies", plan.coping_strategies)
    plan.reasons_to_live = data.get("reasons_to_live", plan.reasons_to_live)
    if "support_contacts" in data:
        plan.support_contacts = data.get("support_contacts") or []
    plan.updated_by = _uuid(updated_by)
    await db.commit()
    await db.refresh(plan)
    return _serialize_safety_plan(plan)


# ── Session action items ──────────────────────────────────────────────────────
def _serialize_action_item(a: SessionActionItem) -> dict:
    return {
        "id": str(a.id),
        "session_id": str(a.session_id),
        "student_id": a.student_id,
        "text": a.text,
        "done": a.done,
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "source": a.source,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


async def list_action_items(db: AsyncSession, session_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(SessionActionItem)
            .where(SessionActionItem.session_id == _uuid(session_id))
            .order_by(SessionActionItem.created_at.asc())
        )
    ).scalars().all()
    return [_serialize_action_item(a) for a in rows]


async def create_action_item(
    db: AsyncSession, session_id: str, text: str, student_id: Optional[str] = None,
    due_date: Any = None, source: str = "manual",
) -> dict:
    item = SessionActionItem(
        session_id=_uuid(session_id),
        student_id=student_id,
        text=text,
        due_date=_parse_date(due_date),
        source=source,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _serialize_action_item(item)


async def update_action_item(db: AsyncSession, item_id: str, data: dict) -> Optional[dict]:
    item = await db.get(SessionActionItem, _uuid(item_id))
    if not item:
        return None
    if "done" in data:
        item.done = bool(data["done"])
    if "text" in data:
        item.text = data["text"]
    if "due_date" in data:
        item.due_date = _parse_date(data.get("due_date"))
    await db.commit()
    await db.refresh(item)
    return _serialize_action_item(item)


# ── Referrals ─────────────────────────────────────────────────────────────────
def _serialize_referral(r: Referral) -> dict:
    return {
        "id": str(r.id),
        "student_id": r.student_id,
        "session_id": str(r.session_id) if r.session_id else None,
        "referred_to": r.referred_to,
        "reason": r.reason,
        "status": r.status,
        "created_by": str(r.created_by) if r.created_by else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


async def list_referrals(db: AsyncSession, student_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(Referral).where(Referral.student_id == student_id).order_by(Referral.created_at.desc())
        )
    ).scalars().all()
    return [_serialize_referral(r) for r in rows]


async def create_referral(db: AsyncSession, student_id: str, data: dict, created_by: Any) -> dict:
    referral = Referral(
        student_id=student_id,
        session_id=_uuid(data.get("session_id")),
        referred_to=data["referred_to"],
        reason=data.get("reason"),
        status=data.get("status", "open"),
        created_by=_uuid(created_by),
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)
    return _serialize_referral(referral)


async def update_referral(db: AsyncSession, referral_id: str, data: dict) -> Optional[dict]:
    referral = await db.get(Referral, _uuid(referral_id))
    if not referral:
        return None
    if "status" in data:
        referral.status = data["status"]
    if "reason" in data:
        referral.reason = data["reason"]
    if "referred_to" in data:
        referral.referred_to = data["referred_to"]
    await db.commit()
    await db.refresh(referral)
    return _serialize_referral(referral)
