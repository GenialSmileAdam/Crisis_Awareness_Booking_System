from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
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

@router.get("/student/{student_id}")
async def list_student_checkins(
    student_id: str,
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get check-in history for a student."""
    # Check permissions
    if current_user["role"] not in ("admin", "psychologist") and current_user.get("student_id") != student_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
         
    query = (
        select(WellnessCheckin)
        .where(WellnessCheckin.student_id == student_id)
        .order_by(WellnessCheckin.submitted_at.desc())
        .limit(limit)
        .offset(offset)
    )
    
    total_query = select(func.count(WellnessCheckin.id)).where(WellnessCheckin.student_id == student_id)
    
    results = await db.execute(query)
    total = await db.execute(total_query)
    
    checkins = results.scalars().all()
    total_count = total.scalar()
    
    return {
        "data": checkins,
        "pagination": {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < total_count
        }
    }

@router.get("/pending")
async def list_pending_checkins(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get pending check-ins for the current student."""
    if current_user.get("role") != "student":
        return []

    student_id = current_user.get("student_id")
    if not student_id:
        from app.models.students import Student
        student = (await db.execute(
            select(Student).where(Student.user_id == current_user["id"])
        )).scalar_one_or_none()
        if not student:
            return []
        student_id = student.student_id

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)

    # Check if they have submitted any check-ins today
    recent_checkins = (await db.execute(
        select(WellnessCheckin).where(
            WellnessCheckin.student_id == student_id,
            WellnessCheckin.submitted_at >= one_day_ago
        )
    )).scalars().all()

    pending = []

    if not recent_checkins:
        pending.append({
            "type": "pulse",
            "message": "It's time for your daily wellness pulse check!"
        })

    # If student is elevated risk and hasn't assessed in 7 days, suggest a full test
    from app.models.risk_scores import RiskScore
    latest_score = (await db.execute(
        select(RiskScore).where(RiskScore.student_id == student_id)
        .order_by(RiskScore.computed_at.desc()).limit(1)
    )).scalar_one_or_none()

    if latest_score and latest_score.tier in (RiskTier.amber, RiskTier.red, RiskTier.critical):
        seven_days_ago = now - timedelta(days=7)
        recent_tests = (await db.execute(
            select(WellnessCheckin).where(
                WellnessCheckin.student_id == student_id,
                WellnessCheckin.type.in_((WellnessCheckinType.phq9, WellnessCheckinType.gad7)),
                WellnessCheckin.submitted_at >= seven_days_ago
            )
        )).scalars().all()

        if not recent_tests:
            pending.append({
                "type": "phq9",
                "message": f"Based on your latest {latest_score.tier.value} risk score, we recommend taking a new PHQ-9 wellness assessment."
            })

    return pending
