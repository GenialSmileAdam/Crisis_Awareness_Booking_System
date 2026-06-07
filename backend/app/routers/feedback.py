from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.routers.dependencies import require_roles
from app.schemas.feedback import FeedbackRequest
from app.services.feedback_service import log_feedback, send_feedback_email
from app.models.feedback import Feedback
from app.utils.response import success

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", status_code=201)
async def submit_feedback(feedback: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    """Submit user feedback (public endpoint)."""
    record = log_feedback(db, feedback)
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
    # Get total count
    count_result = await db.execute(select(Feedback.__table__.columns[0]))
    total = count_result.rowcount

    # Get paginated results
    query = select(Feedback).order_by(Feedback.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    feedbacks = result.scalars().all()

    return success(
        "Feedback retrieved successfully",
        {
            "data": [
                {
                    "id": str(f.id),
                    "name": f.name,
                    "email": f.email,
                    "message": f.message,
                    "rating": f.rating,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                }
                for f in feedbacks
            ],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_next": offset + limit < total,
            },
        }
    )


@router.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}