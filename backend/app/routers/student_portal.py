"""
Student self-service portal endpoints (prefix ``/me``).

Everything here operates on the *current* student's own data, resolved from the
JWT (with a DB fallback). A student can never read or write another student's
records through these routes.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import student_portal_service as svc
from app.services import clinical_service
from app.utils.response import success

router = APIRouter(prefix="/me", tags=["Student Portal"])


async def _current_student_id(current_user: dict, db: AsyncSession) -> str:
    """Resolve the current student's student_id, or 403/400 if not a student."""
    if current_user.get("user_type") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    student_id = current_user.get("student_id")
    if not student_id:
        from app.models.students import Student
        row = (await db.execute(
            select(Student).where(Student.user_id == current_user["id"])
        )).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=400, detail="Student record not found")
        student_id = row.student_id
    return student_id


# ── Schemas ───────────────────────────────────────────────────────────────────
class PreferencesPatch(BaseModel):
    notifications: Optional[dict[str, Any]] = None
    reminder_time: Optional[str] = None
    appearance: Optional[dict[str, Any]] = None
    saved_resource_ids: Optional[list[str]] = None


class GoalIn(BaseModel):
    title: str
    target: Optional[int] = 0


class GoalPatch(BaseModel):
    title: Optional[str] = None
    target: Optional[int] = None
    progress: Optional[int] = None
    status: Optional[str] = None


class SafetyPlanIn(BaseModel):
    warning_signs: Optional[str] = None
    coping_strategies: Optional[str] = None
    reasons_to_live: Optional[str] = None
    support_contacts: Optional[list[dict]] = None


# ── Preferences ───────────────────────────────────────────────────────────────
@router.get("/preferences")
async def get_preferences(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    return success("Preferences", await svc.get_preferences(db, sid))


@router.patch("/preferences")
async def patch_preferences(
    patch: PreferencesPatch,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    sid = await _current_student_id(user, db)
    updated = await svc.update_preferences(db, sid, patch.model_dump(exclude_none=True))
    return success("Preferences updated", updated)


@router.post("/saved-resources/{resource_id}")
async def toggle_saved_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    sid = await _current_student_id(user, db)
    return success("Saved resources updated", await svc.toggle_saved_resource(db, sid, resource_id))


# ── Wellness goals ──────────────────────────────────────────────────────────────
@router.get("/goals")
async def list_goals(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    return success("Goals", await svc.list_goals(db, sid))


@router.post("/goals")
async def create_goal(body: GoalIn, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    return success("Goal created", await svc.create_goal(db, sid, body.title, body.target or 0))


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: str,
    body: GoalPatch,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    sid = await _current_student_id(user, db)
    updated = await svc.update_goal(db, sid, goal_id, body.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return success("Goal updated", updated)


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    if not await svc.delete_goal(db, sid, goal_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return success("Goal deleted", None)


# ── Streak ──────────────────────────────────────────────────────────────────────
@router.get("/streak")
async def get_streak(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    return success("Streak", await svc.get_streak(db, sid))


# ── Safety plan (student-facing, reuses clinical_service) ──────────────────────
@router.get("/safety-plan")
async def get_safety_plan(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    sid = await _current_student_id(user, db)
    return success("Safety plan", await clinical_service.get_safety_plan(db, sid))


@router.put("/safety-plan")
async def put_safety_plan(
    body: SafetyPlanIn,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    sid = await _current_student_id(user, db)
    plan = await clinical_service.upsert_safety_plan(db, sid, body.model_dump(exclude_none=True), updated_by=user.get("id"))
    return success("Safety plan saved", plan)
