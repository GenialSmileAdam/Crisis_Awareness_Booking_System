from datetime import datetime, timezone
from typing import Dict, Optional
from uuid import UUID, uuid4

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Notification, NotificationCategory, NotificationStatus, NotificationType, User
from app.models.students import Student
from app.utils.pagination import paginate
import logging

logger = logging.getLogger(__name__)

# Campus One notification endpoint (per spec: https://auth.campusone.com.ng/api/apps/notifications)
_CAMPUS_ONE_NOTIF_URL = "https://auth.campusone.com.ng/api/apps/notifications"

_TIER_LABELS = {
    "green": "Green — low",
    "amber": "Amber — moderate",
    "red": "Red — high",
    "critical": "Critical — urgent",
}


class NotificationService:
    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    @classmethod
    async def _get_user(cls, db: AsyncSession, user_id: UUID) -> Optional[User]:
        return (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()

    @classmethod
    async def _get_student_user(cls, db: AsyncSession, student_id: str) -> Optional[User]:
        result = await db.execute(
            select(User)
            .join(Student, Student.user_id == User.id)
            .where(Student.student_id == student_id)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def _store(
        cls,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        category: NotificationCategory,
    ) -> Notification:
        n = Notification(
            user_id=user_id,
            type=NotificationType.in_app,
            category=category,
            title=title,
            message=message,
            status=NotificationStatus.sent,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(n)
        await db.commit()
        return n

    # -------------------------------------------------------------------------
    # Campus One push delivery
    # -------------------------------------------------------------------------

    @classmethod
    async def _push_campus_one(
        cls,
        user: User,
        title: str,
        body: str,
        type_: str = "info",
        target_url: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> bool:
        if not user.campus_one_access_token:
            logger.debug(f"User {user.id} has no Campus One token — skipping push")
            return False

        # Enforce field length limits per spec
        title = title[:128]
        body = body[:512]

        headers: Dict[str, str] = {
            "Authorization": f"Bearer {user.campus_one_access_token}",
            "Content-Type": "application/json",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        payload: Dict = {"title": title, "body": body, "type": type_}
        if target_url:
            payload["targetUrl"] = target_url

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(_CAMPUS_ONE_NOTIF_URL, json=payload, headers=headers)
            if resp.status_code == 200:
                logger.info(f"Campus One push sent to user {user.id}")
                return True
            logger.warning(f"Campus One push failed {resp.status_code} for user {user.id}: {resp.text[:200]}")
            return False
        except Exception as exc:
            logger.error(f"Campus One push exception for user {user.id}: {exc}")
            return False

    @classmethod
    async def _notify(
        cls,
        db: AsyncSession,
        user: User,
        title: str,
        body: str,
        category: NotificationCategory,
        campus_one_type: str = "info",
        target_url: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> None:
        """Store internal notification and push to Campus One."""
        if settings.SAFESPACE_NOTIF:
            await cls._store(db, user.id, title, body, category)
        if settings.SAFESPACE_CAMPUS_ONE_NOTIF:
            await cls._push_campus_one(
                user,
                title=title,
                body=body,
                type_=campus_one_type,
                target_url=target_url,
                idempotency_key=idempotency_key,
            )

    # -------------------------------------------------------------------------
    # Appointment lifecycle
    # -------------------------------------------------------------------------

    @classmethod
    async def notify_appointment_requested(
        cls,
        db: AsyncSession,
        appointment_id: UUID,
        student_name: str,
        psychologist_id: UUID,
        start_time: datetime,
    ) -> None:
        """Notify psychologist that a student has requested a session."""
        psychologist = await cls._get_user(db, psychologist_id)
        if not psychologist:
            return

        day = start_time.strftime("%A, %d %b %Y")
        time_ = start_time.strftime("%I:%M %p")

        await cls._notify(
            db,
            psychologist,
            title="New Session Request",
            body=(
                f"{student_name} has requested a session on {day} at {time_}. "
                "Please review and approve or decline."
            ),
            category=NotificationCategory.appointment_requested,
            campus_one_type="action_required",
            target_url=f"{settings.FRONTEND_URL}/counselor",
            idempotency_key=f"appt-req-{appointment_id}",
        )

    @classmethod
    async def notify_appointment_confirmed(
        cls,
        db: AsyncSession,
        appointment_id: UUID,
        student_id: str,
        psychologist_name: str,
        start_time: datetime,
        end_time: datetime,
    ) -> None:
        """Notify student that their session has been confirmed."""
        student_user = await cls._get_student_user(db, student_id)
        if not student_user:
            return

        day = start_time.strftime("%A, %d %b %Y")
        start_ = start_time.strftime("%I:%M %p")
        end_ = end_time.strftime("%I:%M %p")

        await cls._notify(
            db,
            student_user,
            title="Session Confirmed",
            body=(
                f"Your session with {psychologist_name} is confirmed for {day}, "
                f"{start_} – {end_}. Please arrive a few minutes early."
            ),
            category=NotificationCategory.booking_confirmation,
            campus_one_type="success",
            target_url=f"{settings.FRONTEND_URL}/student/appointments",
            idempotency_key=f"appt-confirmed-{appointment_id}",
        )

    @classmethod
    async def notify_appointment_rejected(
        cls,
        db: AsyncSession,
        appointment_id: UUID,
        student_id: str,
        psychologist_name: str,
        start_time: datetime,
    ) -> None:
        """Notify student that their session request was declined."""
        student_user = await cls._get_student_user(db, student_id)
        if not student_user:
            return

        day = start_time.strftime("%A, %d %b %Y")
        time_ = start_time.strftime("%I:%M %p")

        await cls._notify(
            db,
            student_user,
            title="Session Request Declined",
            body=(
                f"Your session request with {psychologist_name} for {day} at {time_} "
                "could not be confirmed — the slot may no longer be available. "
                "Please book another time."
            ),
            category=NotificationCategory.appointment_rejected,
            campus_one_type="warning",
            target_url=f"{settings.FRONTEND_URL}/student/appointments",
            idempotency_key=f"appt-rejected-{appointment_id}",
        )

    # -------------------------------------------------------------------------
    # Wellness / WRS alerts
    # -------------------------------------------------------------------------

    @classmethod
    async def notify_wrs_alert(
        cls,
        db: AsyncSession,
        student_id: str,
        wrs_score: float,
        tier: str,
    ) -> None:
        """
        When a student's check-in produces a Red or Critical WRS:
        - Notify the student that support is available
        - Notify their assigned psychologist (if any) of the elevated score
        """
        tier_label = _TIER_LABELS.get(tier.lower(), tier)
        wrs_int = round(wrs_score)

        # Notify student
        student_row = (await db.execute(
            select(Student).where(Student.student_id == student_id)
        )).scalar_one_or_none()
        if not student_row:
            return

        student_user = await cls._get_user(db, student_row.user_id)
        if student_user:
            if tier.lower() == "critical":
                student_title = "Immediate Support Available"
                student_body = (
                    f"Your wellness check-in shows a score of {wrs_int}/100 ({tier_label}). "
                    "A counselor has been alerted. You can also reach out directly or "
                    "use the crisis hotline — you don't have to go through this alone."
                )
                campus_one_type = "action_required"
            else:  # red
                student_title = "Support is Here for You"
                student_body = (
                    f"Your recent check-in score is {wrs_int}/100 ({tier_label}). "
                    "Consider booking a session with your counselor to talk things through."
                )
                campus_one_type = "warning"

            await cls._notify(
                db,
                student_user,
                title=student_title,
                body=student_body,
                category=NotificationCategory.risk_alert,
                campus_one_type=campus_one_type,
                target_url=f"{settings.FRONTEND_URL}/student",
                idempotency_key=f"wrs-student-{student_id}-{wrs_int}",
            )

        # Notify assigned psychologist (only for Critical)
        if tier.lower() == "critical" and student_row.assigned_psychologist_id:
            psychologist = await cls._get_user(db, student_row.assigned_psychologist_id)
            if psychologist:
                await cls._notify(
                    db,
                    psychologist,
                    title="⚠️ Student Wellness Alert",
                    body=(
                        f"A student's wellness check-in has reached Critical level "
                        f"({wrs_int}/100). They may need immediate support. "
                        "Please check your student dashboard."
                    ),
                    category=NotificationCategory.risk_alert,
                    campus_one_type="action_required",
                    target_url=f"{settings.FRONTEND_URL}/counselor",
                    idempotency_key=f"wrs-psych-{student_id}-{wrs_int}",
                )

    # -------------------------------------------------------------------------
    # Crisis alert (enhanced)
    # -------------------------------------------------------------------------

    @classmethod
    async def send_crisis_alert(
        cls,
        db: AsyncSession,
        psychologist_id: UUID,
        student_id: str,
        appointment_id: UUID,
        wrs_score: Optional[float] = None,
    ) -> None:
        """Alert psychologist of a crisis booking. Also notifies student that help is on the way."""
        psychologist = await cls._get_user(db, psychologist_id)
        student_user = await cls._get_student_user(db, student_id)

        score_text = f" (Wellness Score: {round(wrs_score)}/100)" if wrs_score else ""
        target_url = f"{settings.FRONTEND_URL}/counselor"

        if psychologist and settings.SAFESPACE_NOTIF:
            await cls._notify(
                db,
                psychologist,
                title="⚠️ Crisis Alert — Immediate Attention Required",
                body=(
                    f"A student has submitted a crisis booking{score_text}. "
                    "An emergency session has been auto-confirmed. "
                    "Please respond as soon as possible."
                ),
                category=NotificationCategory.crisis_alert,
                campus_one_type="action_required",
                target_url=target_url,
                idempotency_key=f"crisis-psych-{appointment_id}",
            )

        # Let the student know help is coming
        if student_user and settings.SAFESPACE_NOTIF:
            await cls._notify(
                db,
                student_user,
                title="Help is on the way",
                body=(
                    "Your crisis session request has been received and confirmed. "
                    "Your counselor has been notified and will be in touch shortly. "
                    "If you need immediate help, please use the crisis hotline."
                ),
                category=NotificationCategory.crisis_alert,
                campus_one_type="action_required",
                target_url=f"{settings.FRONTEND_URL}/student",
                idempotency_key=f"crisis-student-{appointment_id}",
            )

    # -------------------------------------------------------------------------
    # Counselor assignment
    # -------------------------------------------------------------------------

    @classmethod
    async def notify_counselor_assigned(
        cls,
        db: AsyncSession,
        student_id: str,
        psychologist_name: str,
    ) -> None:
        """Notify student they have been matched with a counselor."""
        student_user = await cls._get_student_user(db, student_id)
        if not student_user:
            return

        await cls._notify(
            db,
            student_user,
            title="You've Been Matched with a Counselor",
            body=(
                f"{psychologist_name} is now your assigned counselor. "
                "You can book sessions directly with them from the appointments page."
            ),
            category=NotificationCategory.counselor_assigned,
            campus_one_type="success",
            target_url=f"{settings.FRONTEND_URL}/student/appointments",
            idempotency_key=f"assigned-{student_id}",
        )

    # -------------------------------------------------------------------------
    # Query
    # -------------------------------------------------------------------------

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
        notifications = (await db.execute(stmt)).scalars().all()

        data = [
            {
                "id": n.id,
                "type": n.type.value,
                "category": n.category.value,
                "title": n.title,
                "message": n.message,
                "status": n.status.value,
                "read": n.read,
                "sent_at": n.sent_at,
                "created_at": n.created_at,
            }
            for n in notifications
        ]
        return paginate(data=data, total=total, limit=limit, offset=offset)
