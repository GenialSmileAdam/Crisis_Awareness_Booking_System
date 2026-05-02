import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# In-memory (temporary for MVP)
sessions = {}


def create_session(data):
    from uuid import uuid4
    from datetime import datetime

    session_id = str(uuid4())

    session = {
        "id": session_id,
        "appointment_id": data.appointment_id,
        "client_name": data.client_name,
        "notes": data.notes,
        "status": "scheduled",
        "audio_files": [],
        "transcript": None,
        "summary": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    sessions[session_id] = session
    return session


def get_session_by_appointment_id(appointment_id):
    for session in sessions.values():
        if session["appointment_id"] == appointment_id:
            return session
    return None


def upload_audio(session_id, file, content):
    if session_id not in sessions:
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

    sessions[session_id]["audio_files"].append(audio_info)
    sessions[session_id]["status"] = "in_progress"

    return audio_info


def transcribe(session_id):
    if session_id not in sessions:
        return None

    session = sessions[session_id]

    if not session["audio_files"]:
        raise Exception("No audio uploaded")

    file_path = session["audio_files"][-1]["file_path"]

    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3"
        )

    text = transcription.text.strip()
    session["transcript"] = text

    return text


def summarize(session_id):
    if session_id not in sessions:
        return None

    session = sessions[session_id]

    if not session["transcript"]:
        raise Exception("Transcript not available")

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
    {session["transcript"]}"""
        }
    ],
    )

    summary = response.choices[0].message.content.strip()
    session["summary"] = summary
    session["status"] = "completed"

    return summary


def calculate_wrs(data):
    weights = {
        'assessment': 0.35,
        'pulse_trend': 0.25,
        'attendance': 0.15,
        'completion_rate': 0.10,
        'crisis_history': 0.10,
        'session_freq': 0.05
    }

    wrs = sum(data[key] * weights[key] for key in weights)

    if wrs >= 85:
        tier = "Critical"
    elif wrs >= 65:
        tier = "Red"
    elif wrs >= 40:
        tier = "Amber"
    else:
        tier = "Green"

    return {"wrs": round(wrs, 2), "tier": tier}