from datetime import datetime, timezone
from typing import Dict
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Notification, NotificationCategory, NotificationStatus, NotificationType, User
from app.core.oidc import oidc_provider
from app.utils.pagination import paginate
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    @classmethod
    async def send_campus_one_notification(
        cls,
        db: AsyncSession,
        user: User,
        title: str,
        body: str,
        type_: str = "info",
        target_url: str | None = None,
    ) -> bool:
        """
        Sends a notification to a user through Campus One.
        Handles token refreshing if the access token has expired (401/403).
        """
        if not user.campus_one_access_token:
            logger.warning(f"User {user.id} does not have a Campus One access token. Cannot send Campus One notification.")
            return False

        url = "https://api.campusone.com.ng/api/apps/notifications"
        headers = {
            "Authorization": f"Bearer {user.campus_one_access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "title": title,
            "body": body,
            "type": type_,
        }
        if target_url:
            payload["targetUrl"] = target_url

        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10)
                
                # Check for token expiration / auth error (401/403)
                if response.status_code in (401, 403) and user.campus_one_refresh_token:
                    logger.info(f"Campus One token for user {user.id} expired or unauthorized. Attempting to refresh...")
                    try:
                        new_tokens = await oidc_provider.refresh_access_token(user.campus_one_refresh_token)
                        if new_tokens and "access_token" in new_tokens:
                            user.campus_one_access_token = new_tokens["access_token"]
                            if "refresh_token" in new_tokens:
                                user.campus_one_refresh_token = new_tokens["refresh_token"]
                            await db.commit()
                            
                            # Retry request with new token
                            headers["Authorization"] = f"Bearer {user.campus_one_access_token}"
                            response = await client.post(url, json=payload, headers=headers, timeout=10)
                    except Exception as refresh_err:
                        logger.error(f"Failed to refresh Campus One token for user {user.id}: {refresh_err}")
                
                if response.status_code == 200:
                    logger.info(f"Notification successfully sent to user {user.id} via Campus One.")
                    return True
                else:
                    logger.error(f"Campus One notification failed with status {response.status_code}: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error occurred while sending Campus One notification: {e}")
            return False

    @staticmethod
    async def send_crisis_alert(
        db: AsyncSession, psychologist_id: UUID, student_id: UUID, appointment_id: UUID
    ) -> None:
        message = (
            f"Crisis alert for student {student_id}. Appointment {appointment_id}. "
            f"Notify psychologist {psychologist_id}."
        )

        if settings.SAFESPACE_NOTIF:
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

        if settings.SAFESPACE_CAMPUS_ONE_NOTIF:
            user = await db.get(User, psychologist_id)
            if user:
                target_url = f"{settings.FRONTEND_URL}/appointments/{appointment_id}"
                await NotificationService.send_campus_one_notification(
                    db=db,
                    user=user,
                    title="Crisis Alert",
                    body=message,
                    type_="action_required",
                    target_url=target_url
                )

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
