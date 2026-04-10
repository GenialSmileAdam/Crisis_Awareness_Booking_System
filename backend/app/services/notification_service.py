from datetime import datetime, timezone
from typing import Dict
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Notification, NotificationCategory, NotificationStatus, NotificationType
from app.utils.pagination import paginate


class NotificationService:
    @staticmethod
    async def send_crisis_alert(
        db: AsyncSession, psychologist_id: UUID, student_id: UUID, appointment_id: UUID
    ) -> None:
        message = (
            f"Crisis alert for student {student_id}. Appointment {appointment_id}. "
            f"Notify psychologist {psychologist_id}."
        )

        notification = Notification(
            user_id=psychologist_id,
            type=NotificationType.email,
            category=NotificationCategory.crisis_alert,
            message=message,
            status=NotificationStatus.pending,
        )

        if settings.EMAIL_ENABLED:
            notification.status = NotificationStatus.sent
            notification.sent_at = datetime.now(timezone.utc)
            # Week 1 stub: actual SendGrid integration deferred

        db.add(notification)
        await db.commit()

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession, user_id: UUID, limit: int, offset: int
    ) -> Dict:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        total_stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id
        )
        total = (await db.execute(total_stmt)).scalar_one()
        result = await db.execute(stmt)
        notifications = result.scalars().all()

        data = [
            {
                "id": n.id,
                "type": n.type.value,
                "category": n.category.value,
                "message": n.message,
                "status": n.status.value,
                "sent_at": n.sent_at,
                "created_at": n.created_at,
            }
            for n in notifications
        ]
        return paginate(data=data, total=total, limit=limit, offset=offset)
