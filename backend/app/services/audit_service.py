import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditAction, AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    async def log(
        db: AsyncSession,
        user_id: UUID | None,
        action: AuditAction,
        resource_type: str | None,
        resource_id: UUID | None,
        ip_address: str | None,
        details=None,
    ) -> None:
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                details=details,
            )
            db.add(log_entry)
            await db.commit()
        except Exception:
            logger.exception("Failed to write audit log")
