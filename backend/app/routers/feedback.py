from fastapi import APIRouter, HTTPException
from app.schemas.feedback import FeedbackRequest
from app.services.feedback_service import log_to_supabase, send_email_via_resend

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("", status_code=201)
async def submit_feedback(feedback: FeedbackRequest):
    record = await log_to_supabase(feedback)
    await send_email_via_resend(feedback, record)
    return {
        "success": True,
        "message":"Thank you for your feedback!",
        "id": record.get("id")
        }
    
@router.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}
