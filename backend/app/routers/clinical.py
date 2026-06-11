from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import clinical_service
from app.services import session_ai_service
from app.services.notification_service import NotificationService
from app.utils.response import success

router = APIRouter(prefix="/clinical", tags=["Clinical"])

_CLINICAL_ROLES = ("psychologist", "unit_head", "unit_admin", "admin", "staff")


def _require_clinical_access(current_user: dict = Depends(get_current_user)) -> dict:
    roles = current_user.get("roles", [])
    if not any(r in roles for r in _CLINICAL_ROLES):
        raise HTTPException(status_code=403, detail="Clinical staff access required")
    return current_user


# ── Built-in structured-note templates (admin-editable in a later iteration) ──
_NOTE_TEMPLATES = [
    {
        "id": "soap",
        "name": "SOAP Note",
        "body": "Subjective:\n\nObjective:\n\nAssessment:\n\nPlan:\n",
    },
    {
        "id": "intake",
        "name": "Intake Assessment",
        "body": (
            "Presenting concern:\n\nHistory:\n\nCurrent functioning:\n\n"
            "Risk assessment:\n\nStrengths / supports:\n\nInitial plan:\n"
        ),
    },
    {
        "id": "risk",
        "name": "Risk Review",
        "body": (
            "Risk indicators observed:\n\nProtective factors:\n\n"
            "Safety plan reviewed: Y/N\n\nActions taken:\n\nFollow-up:\n"
        ),
    },
]


# ── Schemas ───────────────────────────────────────────────────────────────────
class CarePlanIn(BaseModel):
    title: str
    goals: Optional[list[dict]] = None
    status: Optional[str] = "active"
    review_date: Optional[str] = None


class CarePlanPatch(BaseModel):
    title: Optional[str] = None
    goals: Optional[list[dict]] = None
    status: Optional[str] = None
    review_date: Optional[str] = None


class SafetyPlanIn(BaseModel):
    warning_signs: Optional[str] = None
    coping_strategies: Optional[str] = None
    reasons_to_live: Optional[str] = None
    support_contacts: Optional[list[dict]] = None


class ActionItemIn(BaseModel):
    text: str
    student_id: Optional[str] = None
    due_date: Optional[str] = None
    source: Optional[str] = "manual"


class ActionItemPatch(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    due_date: Optional[str] = None


class ReferralIn(BaseModel):
    referred_to: str
    reason: Optional[str] = None
    session_id: Optional[str] = None
    status: Optional[str] = "open"


class ReferralPatch(BaseModel):
    referred_to: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None


class ShareResourceIn(BaseModel):
    title: str
    message: Optional[str] = None
    url: Optional[str] = None


class FollowUpIn(BaseModel):
    title: str
    starts_at: str  # ISO 8601
    ends_at: Optional[str] = None
    note: Optional[str] = None
    session_id: Optional[str] = None


@router.get("/note-templates")
async def get_note_templates(_: dict = Depends(_require_clinical_access)):
    return success("Templates", _NOTE_TEMPLATES)


# ── Care plans ────────────────────────────────────────────────────────────────
@router.get("/students/{student_id}/care-plans")
async def list_care_plans(student_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access)):
    return success("Care plans", await clinical_service.list_care_plans(db, student_id))


@router.post("/students/{student_id}/care-plans")
async def create_care_plan(
    student_id: str, body: CarePlanIn,
    db: AsyncSession = Depends(get_db), user: dict = Depends(_require_clinical_access),
):
    plan = await clinical_service.create_care_plan(db, student_id, body.model_dump(exclude_none=True), user.get("id"))
    return success("Care plan created", plan)


@router.patch("/care-plans/{plan_id}")
async def update_care_plan(
    plan_id: str, body: CarePlanPatch,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    plan = await clinical_service.update_care_plan(db, plan_id, body.model_dump(exclude_unset=True))
    if not plan:
        raise HTTPException(status_code=404, detail="Care plan not found")
    return success("Care plan updated", plan)


# ── Safety plan ───────────────────────────────────────────────────────────────
@router.get("/students/{student_id}/safety-plan")
async def get_safety_plan(student_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access)):
    return success("Safety plan", await clinical_service.get_safety_plan(db, student_id))


@router.put("/students/{student_id}/safety-plan")
async def upsert_safety_plan(
    student_id: str, body: SafetyPlanIn,
    db: AsyncSession = Depends(get_db), user: dict = Depends(_require_clinical_access),
):
    plan = await clinical_service.upsert_safety_plan(db, student_id, body.model_dump(exclude_unset=True), user.get("id"))
    return success("Safety plan saved", plan)


# ── Session action items ──────────────────────────────────────────────────────
@router.get("/sessions/{session_id}/action-items")
async def list_action_items(session_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access)):
    return success("Action items", await clinical_service.list_action_items(db, session_id))


@router.post("/sessions/{session_id}/action-items")
async def create_action_item(
    session_id: str, body: ActionItemIn,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    item = await clinical_service.create_action_item(
        db, session_id, body.text, student_id=body.student_id, due_date=body.due_date, source=body.source or "manual"
    )
    return success("Action item created", item)


@router.post("/sessions/{session_id}/action-items/suggest")
async def suggest_action_items(
    session_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    """AI-suggest action items from the session summary/transcript (non-persisting)."""
    suggestions = await session_ai_service.suggest_action_items(db, session_id)
    return success("Suggested action items", suggestions)


@router.patch("/action-items/{item_id}")
async def update_action_item(
    item_id: str, body: ActionItemPatch,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    item = await clinical_service.update_action_item(db, item_id, body.model_dump(exclude_unset=True))
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return success("Action item updated", item)


# ── Referrals ─────────────────────────────────────────────────────────────────
@router.get("/students/{student_id}/referrals")
async def list_referrals(student_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access)):
    return success("Referrals", await clinical_service.list_referrals(db, student_id))


@router.post("/students/{student_id}/referrals")
async def create_referral(
    student_id: str, body: ReferralIn,
    db: AsyncSession = Depends(get_db), user: dict = Depends(_require_clinical_access),
):
    referral = await clinical_service.create_referral(db, student_id, body.model_dump(exclude_none=True), user.get("id"))
    return success("Referral created", referral)


@router.patch("/referrals/{referral_id}")
async def update_referral(
    referral_id: str, body: ReferralPatch,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    referral = await clinical_service.update_referral(db, referral_id, body.model_dump(exclude_unset=True))
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return success("Referral updated", referral)


# ── Resource sharing ──────────────────────────────────────────────────────────
@router.post("/students/{student_id}/share-resource")
async def share_resource(
    student_id: str, body: ShareResourceIn,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    """Send a student a resource as an in-app + Campus One notification."""
    message = body.message or f"Your counsellor shared a resource: {body.title}"
    if body.url:
        message = f"{message}\n{body.url}"
    try:
        await NotificationService.notify_student_resource(db, student_id, body.title, message, body.url)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"Resource share notification failed: {exc}")
        raise HTTPException(status_code=502, detail="Failed to notify student")
    return success("Resource shared", {"student_id": student_id, "title": body.title})


@router.post("/students/{student_id}/follow-up")
async def schedule_follow_up(
    student_id: str, body: FollowUpIn,
    db: AsyncSession = Depends(get_db), _: dict = Depends(_require_clinical_access),
):
    """Schedule a follow-up: notify the student + push a Campus One calendar event,
    and persist a session action item if a session is provided."""
    from datetime import datetime
    try:
        starts_at = datetime.fromisoformat(body.starts_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="starts_at must be ISO 8601")
    ends_at = None
    if body.ends_at:
        try:
            ends_at = datetime.fromisoformat(body.ends_at)
        except ValueError:
            ends_at = None
    try:
        await NotificationService.notify_followup(db, student_id, body.title, starts_at, ends_at, body.note)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"Follow-up notification failed: {exc}")
        raise HTTPException(status_code=502, detail="Failed to notify student")

    if body.session_id:
        await clinical_service.create_action_item(
            db, body.session_id,
            text=f"Follow-up: {body.title} ({starts_at.strftime('%d %b %Y, %I:%M %p')})",
            student_id=student_id, due_date=starts_at.date().isoformat(), source="manual",
        )
    return success("Follow-up scheduled", {"student_id": student_id, "title": body.title, "starts_at": body.starts_at})
