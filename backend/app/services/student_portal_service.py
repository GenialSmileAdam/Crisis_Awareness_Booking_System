"""
Student self-service portal: preferences, wellness goals, check-in streak,
saved resources, and a student-facing safety plan (reusing clinical_service).
All data is keyed off the student's own student_id.
"""
from __future__ import annotations

import copy
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student_portal import StudentPreferences, WellnessGoal
from app.models.wellness_checkins import WellnessCheckin


# ── Preferences ───────────────────────────────────────────────────────────────
DEFAULT_PREFERENCES: dict[str, Any] = {
    "notifications": {
        "checkin_reminders": True,
        "appointment_reminders": True,
        "forum_replies": True,
        "resource_shares": True,
    },
    "reminder_time": "18:00",  # local HH:MM the student prefers to check in
    "appearance": {
        "reduced_motion": False,
        "text_size": "base",   # sm | base | lg
    },
    "saved_resource_ids": [],
}


def _deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


async def get_preferences(db: AsyncSession, student_id: str) -> dict:
    row = await db.get(StudentPreferences, student_id)
    stored = row.data if row and isinstance(row.data, dict) else {}
    return _deep_merge(DEFAULT_PREFERENCES, stored)


async def update_preferences(db: AsyncSession, student_id: str, patch: dict) -> dict:
    row = await db.get(StudentPreferences, student_id)
    if row is None:
        row = StudentPreferences(student_id=student_id, data={})
        db.add(row)
    merged = _deep_merge(row.data if isinstance(row.data, dict) else {}, patch or {})
    row.data = merged
    # SQLAlchemy needs a new dict identity to detect the JSON change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(row, "data")
    await db.commit()
    return await get_preferences(db, student_id)


async def toggle_saved_resource(db: AsyncSession, student_id: str, resource_id: str) -> dict:
    prefs = await get_preferences(db, student_id)
    saved = list(prefs.get("saved_resource_ids", []))
    if resource_id in saved:
        saved.remove(resource_id)
    else:
        saved.append(resource_id)
    return await update_preferences(db, student_id, {"saved_resource_ids": saved})


# ── Wellness goals ──────────────────────────────────────────────────────────────
def _serialize_goal(g: WellnessGoal) -> dict:
    return {
        "id": str(g.id),
        "title": g.title,
        "target": g.target,
        "progress": g.progress,
        "status": g.status,
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
    }


async def list_goals(db: AsyncSession, student_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(WellnessGoal)
            .where(WellnessGoal.student_id == student_id)
            .order_by(WellnessGoal.created_at.desc())
        )
    ).scalars().all()
    return [_serialize_goal(g) for g in rows]


async def create_goal(db: AsyncSession, student_id: str, title: str, target: int = 0) -> dict:
    goal = WellnessGoal(student_id=student_id, title=title, target=max(0, int(target or 0)))
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return _serialize_goal(goal)


async def update_goal(db: AsyncSession, student_id: str, goal_id: str, data: dict) -> Optional[dict]:
    try:
        gid = uuid.UUID(str(goal_id))
    except (ValueError, TypeError):
        return None
    goal = await db.get(WellnessGoal, gid)
    if not goal or goal.student_id != student_id:
        return None
    if "title" in data and data["title"]:
        goal.title = data["title"]
    if "target" in data and data["target"] is not None:
        goal.target = max(0, int(data["target"]))
    if "progress" in data and data["progress"] is not None:
        goal.progress = max(0, int(data["progress"]))
    if "status" in data and data["status"]:
        goal.status = data["status"]
    # Auto-complete when a numeric target is reached
    if goal.target > 0 and goal.progress >= goal.target and goal.status == "active":
        goal.status = "done"
    await db.commit()
    await db.refresh(goal)
    return _serialize_goal(goal)


async def delete_goal(db: AsyncSession, student_id: str, goal_id: str) -> bool:
    try:
        gid = uuid.UUID(str(goal_id))
    except (ValueError, TypeError):
        return False
    goal = await db.get(WellnessGoal, gid)
    if not goal or goal.student_id != student_id:
        return False
    await db.delete(goal)
    await db.commit()
    return True


# ── Check-in streak ─────────────────────────────────────────────────────────────
async def get_streak(db: AsyncSession, student_id: str) -> dict:
    """Current consecutive-day check-in streak (ending today or yesterday),
    plus the longest streak and total distinct check-in days."""
    rows = (
        await db.execute(
            select(func.date(WellnessCheckin.submitted_at))
            .where(WellnessCheckin.student_id == student_id)
            .distinct()
        )
    ).all()
    days = sorted({r[0] for r in rows if r[0] is not None})
    if not days:
        return {"current": 0, "longest": 0, "total_days": 0, "checked_in_today": False}

    today = datetime.now(timezone.utc).date()
    day_set = set(days)
    checked_in_today = today in day_set

    # Current streak: walk back from today (or yesterday if not checked in today)
    current = 0
    cursor = today if checked_in_today else today - timedelta(days=1)
    while cursor in day_set:
        current += 1
        cursor -= timedelta(days=1)

    # Longest streak across all recorded days
    longest = 1
    run = 1
    for i in range(1, len(days)):
        if (days[i] - days[i - 1]).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    return {
        "current": current,
        "longest": longest,
        "total_days": len(days),
        "checked_in_today": checked_in_today,
    }
