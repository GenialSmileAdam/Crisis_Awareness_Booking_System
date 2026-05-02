from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import WellnessCheckin, RiskScore
from app.models.wellness_checkins import WellnessCheckinType
from app.models.risk_scores import RiskTier
from app.models.users import User
from app.routers.auth import get_current_user
from app.schemas.wellness_checkins import TestSubmission, TestResultResponse
from app.services.risk_simple import calculate_wrs_and_tier

router = APIRouter()

@router.post("/submit", response_model=TestResultResponse)
async def submit_test(
    data: TestSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a wellness test (PHQ-9, GAD-7, or pulse).
    Saves the check-in and updates the student's risk score.
    """
    # 1. Save the check-in
    checkin = WellnessCheckin(
        student_id=data.student_id,
        type=data.test_type,
        responses=data.responses,
        score=data.score,
    )
    db.add(checkin)
    
    # 2. Calculate WRS and tier (only for PHQ-9/GAD-7 that have a score)
    wrs_score = 50.0
    risk_tier = RiskTier.green
    if data.score is not None and data.test_type in ("phq9", "gad7"):
        wrs_score, tier_str = calculate_wrs_and_tier(data.test_type, data.score)
        risk_tier = RiskTier(tier_str)  # Convert string to enum
        
        # Save risk score to history
        risk = RiskScore(
            student_id=data.student_id,
            wrs_score=wrs_score,
            tier=risk_tier
        )
        db.add(risk)
    
    await db.commit()
    
    return TestResultResponse(
        student_id=data.student_id,
        test_type=data.test_type.value,  # Convert enum to string
        wrs_score=wrs_score,
        risk_tier=risk_tier.value  # Convert enum to string
    )
