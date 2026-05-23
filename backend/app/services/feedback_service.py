import os
import httpx
from sqlalchemy.orm import Session

from app.models.

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackRequest


def log_feedback(db: Session, feedback: FeedbackRequest) -> Feedback:
    record = Feedback(
        name=feedback.name,
        email=feedback.email,
        message=feedback.message,
        rating=feedback.rating,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


async def send_feedback_email(feedback: FeedbackRequest, record: Feedback) -> None:
    resend_api_key = os.getenv("RESEND_API_KEY")
    email_from     = os.getenv("EMAIL_FROM")
    email_to       = os.getenv("EMAIL_TO")

    rating_line = f"Rating: {record.rating}/5" if record.rating else "Rating: N/A"

    payload = {
        "from":    email_from,
        "to":      [email_to],
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
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type":  "application/json",
            },
        )

    if response.status_code not in (200, 201):
        print(f"Resend failed {response.status_code}: {response.text}")
