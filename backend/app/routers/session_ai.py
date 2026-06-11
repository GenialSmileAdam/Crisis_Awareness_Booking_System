from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.security import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import session_ai_service as service

router = APIRouter(prefix="/ai", tags=["Session AI"])

_PSYCHOLOGIST_ROLES = ("psychologist", "unit_head", "unit_admin", "admin", "staff")


def _require_clinical_access(current_user: dict) -> dict:
    roles = current_user.get("roles", [])
    if not any(r in roles for r in _PSYCHOLOGIST_ROLES):
        raise HTTPException(status_code=403, detail="Clinical staff access required")
    return current_user


class SessionCreate(BaseModel):
    appointment_id: str
    client_name: str
    notes: Optional[str] = None


class SessionNotesUpdate(BaseModel):
    notes: str


@router.get("/sessions/by-appointment/{appointment_id}")
async def get_session_by_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    session = await service.get_session_by_appointment_id(db, appointment_id)
    if not session:
        return None
    return session


@router.patch("/sessions/{session_id}/notes")
async def update_session_notes(
    session_id: str,
    body: SessionNotesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    session_uuid = uuid.UUID(session_id)
    from app.models.session import Session
    session = await db.get(Session, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.notes = body.notes
    await db.commit()
    await db.refresh(session)
    return {"id": str(session.id), "notes": session.notes}


@router.post("/sessions")
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    existing = await service.get_session_by_appointment_id(db, data.appointment_id)
    if existing:
        return existing
    return await service.create_session(db, data)


@router.post("/sessions/{session_id}/audio")
async def upload_audio(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    allowed_types = [
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/mp3",
        "video/mp4",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported format")

    content = await file.read()
    audio = await service.upload_audio(db, session_id, file, content)
    if not audio:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Audio uploaded", "audio": audio}


@router.post("/transcribe/{session_id}")
async def transcribe(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    try:
        text = await service.transcribe(db, session_id)
        if text is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"transcript": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarise/{session_id}")
async def summarize(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
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
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_clinical_access(current_user)
    try:
        existing = await service.get_session_by_appointment_id(db, appointment_id)
        if existing:
            session_id = existing["id"]
        else:
            data = SessionCreate(
                appointment_id=appointment_id,
                client_name=client_name,
                notes=notes,
            )
            session = await service.create_session(db, data)
            session_id = session["id"]

        allowed_types = [
            "audio/mpeg",
            "audio/wav",
            "audio/mp4",
            "audio/mp3",
            "video/mp4",
        ]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported format")

        content = await file.read()
        await service.upload_audio(db, session_id, file, content)

        transcript = await service.transcribe(db, session_id)
        summary = await service.summarize(db, session_id)

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

        checkins_res = await db.execute(
            select(WellnessCheckin).where(WellnessCheckin.student_id == student_id)
        )
        checkins = checkins_res.scalars().all()

        phq9_gad7_scores = [c.score for c in checkins if c.type in ("phq9", "gad7") and c.score is not None]
        pulse_scores = [c.score for c in checkins if c.type == "pulse" and c.score is not None]

        avg_assessment = sum(phq9_gad7_scores) / len(phq9_gad7_scores) if phq9_gad7_scores else 13.5
        assessment_norm = min(100.0, max(0.0, (avg_assessment / 27.0) * 100.0))

        # Pulse: scale 1-5, higher = lower risk (better wellness)
        avg_pulse = sum(pulse_scores) / len(pulse_scores) if pulse_scores else 3.0
        pulse_norm = min(100.0, max(0.0, ((5.0 - avg_pulse) / 4.0) * 100.0))

        crisis_count = (await db.execute(
            select(func.count(CrisisLog.id)).where(CrisisLog.student_id == student_id)
        )).scalar() or 0
        crisis_history_score = min(float(crisis_count * 20.0), 100.0)

        appt_rows_res = await db.execute(
            select(Appointment).where(Appointment.student_id == student_id)
        )
        appt_rows = appt_rows_res.scalars().all()
        completed_appts = [a for a in appt_rows if str(a.status) in ("completed", "AppointmentStatus.completed")]
        total_past = len([a for a in appt_rows if str(a.status).split(".")[-1] in ("completed", "cancelled", "no_show")])
        attendance_score = (len(completed_appts) / total_past) * 100.0 if total_past else 100.0

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        recent_appts = [
            a for a in appt_rows
            if (a.start_time.replace(tzinfo=timezone.utc) if a.start_time.tzinfo is None else a.start_time)
            >= thirty_days_ago
        ]
        session_freq_score = min(len(recent_appts) * 20.0, 100.0)

        dynamic_metrics = {
            "assessment": assessment_norm,
            "pulse_trend": pulse_norm,
            "attendance": attendance_score,
            "completion_rate": 75.0,
            "crisis_history": crisis_history_score,
            "session_freq": session_freq_score,
        }

        from app.services import config_service
        cfg = await config_service.get_config(db)
        wrs_result = service.calculate_wrs(
            dynamic_metrics,
            weights=cfg["wrs"]["weights"],
            thresholds={k: float(v) for k, v in cfg["wrs"]["thresholds"].items()},
        )

        from app.models.risk_scores import RiskScore, RiskTier
        risk = RiskScore(
            student_id=student_id,
            wrs_score=wrs_result["wrs"],
            tier=RiskTier(wrs_result["tier"]),
        )
        db.add(risk)
        await db.commit()

        return {
            "session_id": session_id,
            "transcript": transcript,
            "summary": summary,
            "wrs_score": wrs_result["wrs"],
            "risk_tier": wrs_result["tier"],
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
