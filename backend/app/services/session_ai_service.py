import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from groq import Groq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.session import Session
from app.models.appointments import Appointment
from app.models.students import Student
from app.models.users import User


def _get_groq_client() -> Groq:
    """Helper to lazily initialize the Groq client."""
    return Groq(api_key=settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", ""))


def _serialize_session(session: Session) -> dict:
    """Helper to serialize a Session model instance into a dictionary."""
    return {
        "id": str(session.id),
        "appointment_id": str(session.appointment_id),
        "client_name": None,  # Dynamically resolved in detail queries
        "notes": session.notes,
        "status": session.status,
        "audio_files": session.audio_files or [],
        "transcript": session.transcript,
        "summary": session.summary,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


async def create_session(db: AsyncSession, data: Any) -> dict:
    """Create a Session record in the database."""
    appointment_id = uuid.UUID(data.appointment_id) if isinstance(data.appointment_id, str) else data.appointment_id
    
    session = Session(
        appointment_id=appointment_id,
        summary=None,
        transcript=None,
        notes=data.notes,
        status="scheduled",
        audio_files=[]
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Resolve client_name for frontend compatibility
    return await get_session_details(db, session.id)


async def get_session_details(db: AsyncSession, session_id: uuid.UUID) -> Optional[dict]:
    """Retrieve session details along with student's full name."""
    query = (
        select(Session, User.full_name)
        .join(Appointment, Appointment.id == Session.appointment_id)
        .join(Student, Student.student_id == Appointment.student_id)
        .join(User, User.id == Student.user_id)
        .where(Session.id == session_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        # Fallback to simple select if relations aren't fully set up in tests
        session = await db.get(Session, session_id)
        return _serialize_session(session) if session else None
        
    session, full_name = row
    data = _serialize_session(session)
    data["client_name"] = full_name
    return data


async def get_session_by_appointment_id(db: AsyncSession, appointment_id: Any) -> Optional[dict]:
    """Retrieve session details by its appointment ID."""
    appt_uuid = uuid.UUID(appointment_id) if isinstance(appointment_id, str) else appointment_id
    query = (
        select(Session, User.full_name)
        .join(Appointment, Appointment.id == Session.appointment_id)
        .join(Student, Student.student_id == Appointment.student_id)
        .join(User, User.id == Student.user_id)
        .where(Session.appointment_id == appt_uuid)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        # Fallback to simple query
        query_simple = select(Session).where(Session.appointment_id == appt_uuid)
        res_simple = await db.execute(query_simple)
        session = res_simple.scalar_one_or_none()
        return _serialize_session(session) if session else None
        
    session, full_name = row
    data = _serialize_session(session)
    data["client_name"] = full_name
    return data


async def upload_audio(db: AsyncSession, session_id: str, file: Any, content: bytes) -> Optional[dict]:
    """Upload session audio file and update database record."""
    session_uuid = uuid.UUID(session_id)
    session = await db.get(Session, session_uuid)
    if not session:
        return None

    safe_name = os.path.basename(file.filename)
    file_path = f"{session_id}_{safe_name}"

    with open(file_path, "wb") as f:
        f.write(content)

    audio_info = {
        "filename": safe_name,
        "file_path": file_path,
        "content_type": file.content_type
    }

    current_audio_files = list(session.audio_files or [])
    current_audio_files.append(audio_info)
    session.audio_files = current_audio_files
    session.status = "in_progress"

    await db.commit()
    await db.refresh(session)
    return audio_info


async def transcribe(db: AsyncSession, session_id: str) -> Optional[str]:
    """Transcribe audio via Groq and clean up raw file immediately."""
    session_uuid = uuid.UUID(session_id)
    session = await db.get(Session, session_uuid)
    if not session:
        return None

    if not session.audio_files:
        raise Exception("No audio uploaded")

    file_path = session.audio_files[-1]["file_path"]

    client = _get_groq_client()
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3"
        )

    text = transcription.text.strip()
    session.transcript = text
    await db.commit()
    await db.refresh(session)

    # Clean up local audio files to free disk space
    for audio in session.audio_files:
        path = audio.get("file_path")
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to delete audio file {path}: {e}")

    return text


async def summarize(db: AsyncSession, session_id: str) -> Optional[str]:
    """Summarize transcript via Groq LLM."""
    session_uuid = uuid.UUID(session_id)
    session = await db.get(Session, session_uuid)
    if not session:
        return None

    if not session.transcript:
        raise Exception("Transcript not available")

    client = _get_groq_client()
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": """You are a professional therapist assistant for SafeSpace, a mental health platform at Nile University of Nigeria. 

    You are trained to write structured, objective, and concise clinical session notes while maintaining NDPR (Nigeria Data Protection Regulation) compliance. 

    GUIDELINES:
    - Do not make assumptions beyond the transcript.
    - Use neutral, professional, and non-stigmatizing language.
    - Do not provide a formal medical diagnosis; use wellness screenings and indicators only.
    - If info is missing or unclear, say "Not explicitly stated."
    - Map archetypes to risk tiers based on severity patterns indicated in the transcript.
    - If no archetype fits clearly, choose the closest match and note any uncertainty in the justification.

    INTERNAL KNOWLEDGE - SAFESPACE RISK TIERS:
    - Green (0-39): Low risk.
    - Amber (40-64): Elevated risk; triggers wellness tips and counselor visibility.
    - Red (65-84): High risk; triggers counselor alerts and priority booking.
    - Critical (85-100): Crisis-imminent; immediate escalation to supervisor.

    INTERNAL KNOWLEDGE - STUDENT ARCHETYPES:
    - Thriving: Stable, socially engaged (PHQ-9/GAD-7: 0–4).
    - Stressed Achiever: Perfectionist, functional but under pressure (PHQ-9/GAD-7: 5–9).
    - Quiet Struggler: Private, avoids help, withdrawing (PHQ-9: 10–14).
    - Anxious Overthinker: Dominated by fear of failure and worry (GAD-7: 10–14).
    - Burnt-Out: Mentally exhausted, detached, irritable (PHQ-9: 15–19).
    - Detached / Numb: Severe numbness, low energy, total withdrawal (PHQ-9: 20–27).
    - Crisis Student: Severe distress, panic episodes, inability to focus (PHQ-9: 20–27, GAD-7: 15–21).
    - Fluctuating: Unstable emotional patterns that vary widely over time."""
            },
            {
                "role": "user",
                "content": f"""
    Analyze the therapy session transcript below and produce structured clinical notes for the SafeSpace platform.

    Follow this format exactly:

    Main Concerns:
    - List the primary issues discussed

    Emotional State:
    - Describe the client's emotions and tone

    SafeSpace Wellness Assessment:
    - Identified Archetype: [Choose one of the 8 archetypes]
    - Risk Tier: [Green, Amber, Red, or Critical]
    - Assessment Justification: [Briefly list behavior or transcript markers supporting this tier]

    Key Observations:
    - Note important behaviors, patterns, or statements

    Recommendations:
    - Suggest reasonable next steps or areas to explore

    Guidelines:
    - Be concise and precise
    - Avoid repetition
    - Do not hallucinate missing information
    - Ensure the Risk Tier matches the identified archetype traits

    Transcript:
    {session.transcript}"""
            }
        ],
    )

    summary = response.choices[0].message.content.strip()
    session.summary = summary
    session.status = "completed"
    await db.commit()
    await db.refresh(session)

    return summary


def calculate_wrs(data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate the Wellness Risk Score safely with fallbacks and lowercase tiers."""
    weights = {
        'assessment': 0.35,
        'pulse_trend': 0.25,
        'attendance': 0.15,
        'completion_rate': 0.10,
        'crisis_history': 0.10,
        'session_freq': 0.05
    }

    wrs = sum(float(data.get(key, 0.0)) * weights[key] for key in weights)

    if wrs >= 85:
        tier = "critical"
    elif wrs >= 65:
        tier = "red"
    elif wrs >= 40:
        tier = "amber"
    else:
        tier = "green"

    return {"wrs": round(wrs, 2), "tier": tier}