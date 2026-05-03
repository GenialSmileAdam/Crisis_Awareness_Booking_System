from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import analytics_service as service
from app.routers.dependencies import require_roles
from app.core.database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])

class DashboardData(BaseModel):
    charts: Dict[str, Any]  # e.g., {"risk_trend": [data points], "session_freq": [data points]}

@router.post("/insights", dependencies=[require_roles("staff", "admin")])
def get_dashboard_insights(data: DashboardData):
    try:
        insights = service.generate_insights(data.charts)
        return {"insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/real-data", dependencies=[require_roles("staff", "admin")])
async def get_real_analytics_data(db: AsyncSession = Depends(get_db)):
    try:
        chart_data = await service.get_real_chart_data(db)
        insights = service.generate_insights(chart_data)
        return {"charts": chart_data, "insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))