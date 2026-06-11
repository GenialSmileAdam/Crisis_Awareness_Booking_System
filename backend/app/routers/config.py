from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.routers.dependencies import require_roles
from app.services import config_service
from app.utils.response import success

router = APIRouter(prefix="/config", tags=["Config"])


class ConfigPatch(BaseModel):
    """Partial config update — any subset of sections is deep-merged."""
    wrs: Optional[dict[str, Any]] = None
    alerts: Optional[dict[str, Any]] = None
    assignment: Optional[dict[str, Any]] = None


@router.get("")
async def get_public_config(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Non-sensitive config for any authenticated user (e.g. WRS tier thresholds
    used for client-side display)."""
    cfg = await config_service.get_config(db)
    return success("Config retrieved", config_service.public_subset(cfg))


@router.get("/admin")
async def get_admin_config(
    db: AsyncSession = Depends(get_db),
    _: dict = require_roles("admin"),
):
    """Full system config — admin only."""
    cfg = await config_service.get_config(db)
    return success("Admin config retrieved", cfg)


@router.patch("/admin")
async def update_admin_config(
    patch: ConfigPatch,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin"),
):
    """Deep-merge a partial config update — admin only."""
    patch_data = patch.model_dump(exclude_none=True)
    updated_by = None
    raw_id = current_user.get("id")
    if raw_id:
        try:
            updated_by = uuid.UUID(str(raw_id))
        except (ValueError, TypeError):
            updated_by = None
    cfg = await config_service.update_config(db, patch_data, updated_by=updated_by)
    return success("Config updated", cfg)
