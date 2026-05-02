from fastapi import APIRouter, Depends, Query

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.notification_service import NotificationService
from app.utils.response import success

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    limit: int = Query(default=20),
    offset: int = Query(default=0),
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await NotificationService.get_user_notifications(
        db, current_user["id"], limit, offset
    )
    return success("Notifications fetched", result)
