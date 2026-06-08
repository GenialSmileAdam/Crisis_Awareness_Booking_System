import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.config import settings
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackRequest


async def log_feedback(db: AsyncSession, feedback: FeedbackRequest, user_type: Optional[str] = None) -> Feedback:
    record = Feedback(
        name=feedback.name,
        email=feedback.email,
        message=feedback.message,
        rating=feedback.rating,
        user_type=user_type,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def send_feedback_email(feedback: FeedbackRequest, record: Feedback) -> None:
    if not settings.EMAIL_ENABLED:
        print("[info] Email disabled, skipping notification.")
        return

    rating_line = f"Rating: {record.rating}/5" if record.rating else "Rating: N/A"

    payload = {
        "from":    settings.EMAIL_FROM,
        "to":      [settings.EMAIL_TO],
        "subject": f"New Feedback from {record.name}",
        "text": (
            f"New feedback submission\n"
            f"{'─' * 30}\n"
            f"Name:    {record.name}\n"
            f"Email:   {record.email}\n"
            f"{rating_line}\n\n"
            f"Message:\n{record.message}\n"
            f"{'─' * 30}\n"
            f"Logged at: {record.created_at}"
        ),
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
        )

    if response.status_code not in (200, 201):
        print(f"[warn] Resend failed {response.status_code}: {response.text}")