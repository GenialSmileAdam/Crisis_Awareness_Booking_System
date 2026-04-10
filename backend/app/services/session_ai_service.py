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
            "content": """You are a professional therapist assistant trained to write structured, objective, and concise clinical session notes.

            Do not make assumptions beyond the transcript.
            Do not include irrelevant details.
            Use neutral and professional language."""
                    },
                    {
                        "role": "user",
                        "content": f"""
            Analyze the therapy session transcript below and produce structured clinical notes.

            Follow this format exactly:

            Main Concerns:
            - List the primary issues discussed

            Emotional State:
            - Describe the client's emotions and tone

            Key Observations:
            - Note important behaviors, patterns, or statements

            Recommendations:
            - Suggest reasonable next steps or areas to explore

            Guidelines:
            - Be concise and precise
            - Avoid repetition
            - Do not hallucinate missing information
            - If something is unclear, say "Not explicitly stated"

            Transcript:
            {session["transcript"]}
            """
                    }
                ],
            )

    summary = response.choices[0].message.content.strip()
    session["summary"] = summary
    session["status"] = "completed"

    return summary