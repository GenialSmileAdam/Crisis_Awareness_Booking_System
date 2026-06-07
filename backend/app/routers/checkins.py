from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import WellnessCheckin, RiskScore
from app.models.wellness_checkins import WellnessCheckinType
from app.models.risk_scores import RiskTier
from app.schemas.wellness_checkins import TestSubmission, TestResultResponse
from app.services.risk_simple import calculate_wrs_and_tier

router = APIRouter()

@router.post("/submit", response_model=TestResultResponse)
async def submit_test(
    data: TestSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a wellness test (PHQ-9, GAD-7, or pulse).
    Saves the check-in and updates the student's risk score.
    """
    # Verify current user is a student
    if current_user.get("user_type") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit check-ins")

    # Get student_id from JWT (not from request)
    student_id = current_user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID not found in authentication token")

    # Optionally verify that the submitted student_id matches (security check)
    if data.student_id and data.student_id != student_id:
        raise HTTPException(status_code=403, detail="Cannot submit check-in for another student")

    # 1. Save the check-in
    checkin = WellnessCheckin(
        student_id=student_id,
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
            student_id=student_id,
            wrs_score=wrs_score,
            tier=risk_tier
        )
        db.add(risk)

    await db.commit()

    # Check if crisis escalation is needed (red or critical)
    crisis_escalation_required = risk_tier in (RiskTier.red, RiskTier.critical)

    return TestResultResponse(
        student_id=student_id,
        test_type=data.test_type.value,  # Convert enum to string
        wrs_score=wrs_score,
        risk_tier=risk_tier.value,  # Convert enum to string
        crisis_escalation_required=crisis_escalation_required
    )

@router.get("/student/{student_id}")
async def list_student_checkins(
    student_id: str,
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get check-in history for a student."""
    # Check permissions: admin, psychologist, staff, or the student themselves
    user_roles = current_user.get("roles", [])
    is_authorized = any(role in user_roles for role in ["psychologist", "unit_head"])
    is_self = "student" in user_roles and current_user.get("student_id") == student_id

    if not (is_authorized or is_self):
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
    """Get pending check-ins for the current student.

    Schedule:
    - Pulse: Daily
    - PHQ-9: Every 4 weeks
    - GAD-7: Every 4 weeks
    """
    user_roles = current_user.get("roles", [])
    if "student" not in user_roles:
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
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    pending = []

    # 1. Check Pulse: Daily
    pulse_today = (await db.execute(
        select(WellnessCheckin).where(
            WellnessCheckin.student_id == student_id,
            WellnessCheckin.type == WellnessCheckinType.pulse,
            WellnessCheckin.submitted_at >= today_start
        )
    )).scalar_one_or_none()

    if not pulse_today:
        pending.append({
            "type": "pulse",
            "message": "Time for your daily wellness pulse check!"
        })

    # 2. Check PHQ-9: Every 4 weeks (28 days)
    last_phq9 = (await db.execute(
        select(WellnessCheckin).where(
            WellnessCheckin.student_id == student_id,
            WellnessCheckin.type == WellnessCheckinType.phq9
        ).order_by(WellnessCheckin.submitted_at.desc()).limit(1)
    )).scalar_one_or_none()

    four_weeks_ago = now - timedelta(days=28)
    if not last_phq9 or last_phq9.submitted_at < four_weeks_ago:
        pending.append({
            "type": "phq9",
            "message": "It's time for your PHQ-9 depression assessment (every 4 weeks)"
        })

    # 3. Check GAD-7: Every 4 weeks (28 days)
    last_gad7 = (await db.execute(
        select(WellnessCheckin).where(
            WellnessCheckin.student_id == student_id,
            WellnessCheckin.type == WellnessCheckinType.gad7
        ).order_by(WellnessCheckin.submitted_at.desc()).limit(1)
    )).scalar_one_or_none()

    if not last_gad7 or last_gad7.submitted_at < four_weeks_ago:
        pending.append({
            "type": "gad7",
            "message": "It's time for your GAD-7 anxiety assessment (every 4 weeks)"
        })

    return pending
