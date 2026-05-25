from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.routers.dependencies import require_roles
from app.services.analytics_service import get_real_chart_data

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/real-data")
async def get_real_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    data = await get_real_chart_data(db)
    return {"success": True, "data": data}


@router.get("/university")
async def get_university_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin"),
):
    data = await get_real_chart_data(db)
    return {"success": True, "data": data}


@router.get("/department/{dept_id}")
async def get_department_analytics(
    dept_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    data = await get_real_chart_data(db)
    return {"success": True, "data": data}


@router.get("/summary-report")
async def get_summary_report(
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin"),
):
    data = await get_real_chart_data(db)
    return {"success": True, "data": data}
