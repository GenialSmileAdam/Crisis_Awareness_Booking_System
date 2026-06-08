from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from jose import JWTError, jwt

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.routers.dependencies import require_roles
from app.schemas.feedback import FeedbackRequest
from app.services.feedback_service import log_feedback, send_feedback_email
from app.models.feedback import Feedback
from app.utils.response import success
from app.utils.pagination import paginate

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _optional_user_type(request: Request) -> Optional[str]:
    """Return role string from JWT if present, or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        roles = payload.get("roles", [])
        if "unit_head" in roles:
            return "admin"
        if "psychologist" in roles:
            return "psychologist"
        if "student" in roles:
            return "student"
    except (JWTError, Exception):
        pass
    return None


@router.post("", status_code=201)
async def submit_feedback(
    feedback: FeedbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Submit user feedback. Works for any authenticated user."""
    user_type = _optional_user_type(request)
    record = await log_feedback(db, feedback, user_type=user_type)
    await send_feedback_email(feedback, record)
    return {
        "success": True,
        "message": "Thank you for your feedback!",
        "id": str(record.id),
    }


@router.get("")
async def list_feedback(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin", "staff"),
):
    """List all feedback (admin/staff only)."""
    total = (await db.execute(select(func.count(Feedback.id)))).scalar_one()

    feedbacks = (
        await db.execute(
            select(Feedback).order_by(Feedback.created_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    data = [
        {
            "id": str(f.id),
            "name": f.name,
            "email": f.email,
            "message": f.message,
            "rating": f.rating,
            "user_type": getattr(f, "user_type", None),
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in feedbacks
    ]
    return success("Feedback retrieved successfully", paginate(data=data, total=total, limit=limit, offset=offset))


@router.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}