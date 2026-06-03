from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.dependencies import require_roles
from app.services.analytics_service import generate_ai_insights, get_real_chart_data

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/real-data")
async def get_real_analytics(
    days: int = Query(default=30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    charts = await get_real_chart_data(db, days=days)
    insights = generate_ai_insights(charts)
    return {"success": True, "data": {"charts": charts, "insights": insights}}


@router.get("/university")
async def get_university_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin"),
):
    charts = await get_real_chart_data(db)
    return {"success": True, "data": {"charts": charts, "insights": {}}}


@router.get("/department/{dept_id}")
async def get_department_analytics(
    dept_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin", "psychologist"),
):
    charts = await get_real_chart_data(db, dept_id=dept_id)
    return {"success": True, "data": {"charts": charts, "insights": {}}}


@router.get("/summary-report")
async def get_summary_report(
    db: AsyncSession = Depends(get_db),
    current_user: dict = require_roles("admin"),
):
    charts = await get_real_chart_data(db)
    return {"success": True, "data": {"charts": charts, "insights": {}}}
