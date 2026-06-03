from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import session_ai_service as service

router = APIRouter(prefix="/ai", tags=["Session AI"])


class SessionCreate(BaseModel):
    appointment_id: str
    client_name: str
    notes: Optional[str] = None


@router.post("/sessions")
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_session(db, data)


@router.post("/sessions/{session_id}/audio")
async def upload_audio(session_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    allowed_types = [
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/mp3",
        "video/mp4"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported format")

    content = await file.read()

    audio = await service.upload_audio(db, session_id, file, content)

    if not audio:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Audio uploaded", "audio": audio}


@router.post("/transcribe/{session_id}")
async def transcribe(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        text = await service.transcribe(db, session_id)
        if text is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"transcript": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarise/{session_id}")
async def summarize(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        summary = await service.summarize(db, session_id)
        if summary is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/analyze")
async def analyze_session(
    appointment_id: str = Form(...),
    client_name: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Create session
        data = SessionCreate(
            appointment_id=appointment_id,
            client_name=client_name,
            notes=notes
        )
        session = await service.create_session(db, data)
        session_id = session["id"]

        # 2. Upload audio
        allowed_types = [
            "audio/mpeg",
            "audio/wav",
            "audio/mp4",
            "audio/mp3",
            "video/mp4"
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported format")

        content = await file.read()
        await service.upload_audio(db, session_id, file, content)

        # 3. Transcribe
        transcript = await service.transcribe(db, session_id)

        # 4. Summarize
        summary = await service.summarize(db, session_id)

        # 5. Dynamic WRS & Risk Tier Analysis
        from app.models.appointments import Appointment
        from app.models.wellness_checkins import WellnessCheckin
        from app.models.crisis_logs import CrisisLog
        from sqlalchemy import select, func
        from datetime import datetime, timezone, timedelta

        appt_uuid = uuid.UUID(appointment_id)
        appt_res = await db.execute(select(Appointment).where(Appointment.id == appt_uuid))
        appointment = appt_res.scalar_one_or_none()
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        student_id = appointment.student_id

        # Query checkins
        checkins_res = await db.execute(
            select(WellnessCheckin).where(WellnessCheckin.student_id == student_id)
        )
        checkins = checkins_res.scalars().all()

        phq9_gad7_scores = [c.score for c in checkins if c.type in ("phq9", "gad7") and c.score is not None]
        pulse_scores = [c.score for c in checkins if c.type == "pulse" and c.score is not None]

        # Calculate metrics
        avg_assessment = sum(phq9_gad7_scores) / len(phq9_gad7_scores) if phq9_gad7_scores else 13.5
        assessment_norm = (avg_assessment / 27.0) * 100.0

        avg_pulse = sum(pulse_scores) / len(pulse_scores) if pulse_scores else 5.0
        pulse_norm = (avg_pulse / 10.0) * 100.0

        # Query crisis logs
        crisis_count = (await db.execute(
            select(func.count(CrisisLog.id)).where(CrisisLog.student_id == student_id)
        )).scalar() or 0
        crisis_history_score = min(float(crisis_count * 20.0), 100.0)

        # Query appointments for attendance & frequency
        appt_rows_res = await db.execute(
            select(Appointment).where(Appointment.student_id == student_id)
        )
        appt_rows = appt_rows_res.scalars().all()
        completed_appts = [a for a in appt_rows if a.status == "completed"]
        total_past = len([a for a in appt_rows if a.status in ("completed", "cancelled", "no_show")])
        attendance_score = (len(completed_appts) / total_past) * 100.0 if total_past else 100.0

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        recent_appts = [a for a in appt_rows if a.start_time >= thirty_days_ago]
        session_freq_score = min(len(recent_appts) * 20.0, 100.0)

        dynamic_metrics = {
            "assessment": assessment_norm,
            "pulse_trend": pulse_norm,
            "attendance": attendance_score,
            "completion_rate": 75.0,  # Default fallback
            "crisis_history": crisis_history_score,
            "session_freq": session_freq_score
        }

        wrs_result = service.calculate_wrs(dynamic_metrics)

        # Save WRS to risk scores database history
        from app.models.risk_scores import RiskScore, RiskTier
        risk = RiskScore(
            student_id=student_id,
            wrs_score=wrs_result["wrs"],
            tier=RiskTier(wrs_result["tier"])
        )
        db.add(risk)
        await db.commit()

        return {
            "session_id": session_id,
            "transcript": transcript,
            "summary": summary,
            "wrs_score": wrs_result["wrs"],
            "risk_tier": wrs_result["tier"]
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))