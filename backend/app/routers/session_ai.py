from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services import session_ai_service as service

router = APIRouter(prefix="/ai", tags=["Session AI"])


class SessionCreate(BaseModel):
    appointment_id: str
    client_name: str
    notes: Optional[str] = None


@router.post("/sessions")
def create_session(data: SessionCreate):
    return service.create_session(data)


@router.post("/sessions/{session_id}/audio")
async def upload_audio(session_id: str, file: UploadFile = File(...)):
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

    audio = service.upload_audio(session_id, file, content)

    if not audio:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Audio uploaded", "audio": audio}


@router.post("/transcribe/{session_id}")
def transcribe(session_id: str):
    try:
        text = service.transcribe(session_id)
        return {"transcript": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarise/{session_id}")
def summarize(session_id: str):
    try:
        summary = service.summarize(session_id)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
from fastapi import Form


@router.post("/sessions/analyze")
async def analyze_session(
    appointment_id: str = Form(...),
    client_name: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        # 1. Create session
        data = SessionCreate(
            appointment_id=appointment_id,
            client_name=client_name,
            notes=notes
        )
        session = service.create_session(data)
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
        service.upload_audio(session_id, file, content)

        # 3. Transcribe
        transcript = service.transcribe(session_id)

        # 4. Summarize
        summary = service.summarize(session_id)

        #5. Analyze (placeholder for actual analysis logic)
        sample_data = {
            "assessment": 70,
            "pulse_trend": 60,
            "attendance": 50,
            "completion_rate": 50,
            "crisis_history": 20,
            "session_freq": 40
}
        wrs_result = service.calculate_wrs(sample_data)

        return {
            "session_id": session_id,
            "transcript": transcript,
            "summary": summary,
            "wrs_score": wrs_result["wrs"],
            "risk_tier": wrs_result["tier"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))