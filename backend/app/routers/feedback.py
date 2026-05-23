from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.feedback import FeedbackRequest
from app.services.feedback_service import log_feedback, send_feedback_email

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", status_code=201)
async def submit_feedback(feedback: FeedbackRequest, db: Session = Depends(get_db)):
    record = log_feedback(db, feedback)
    await send_feedback_email(feedback, record)
    return {
        "success": True,
        "message": "Thank you for your feedback!",
        "id": str(record.id),
    }


@router.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}