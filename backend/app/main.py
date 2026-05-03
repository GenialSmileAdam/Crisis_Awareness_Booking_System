from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    analytics,
    appointments,
    auth,
    checkins,
    consent,
    forum,
    risk_scores,
    staff,
    students,
    users,
)
from app import models

from app.routers import session_ai

app = FastAPI(
    title="PsyUnit API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:8080",
    "https://crisis-awareness-booking-system.vercel.app",
    "https://www.crisis-awareness-booking-system.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(staff.router)
app.include_router(appointments.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(session_ai.router)
app.include_router(consent.router, prefix="/consent", tags=["Consent"])
app.include_router(checkins.router, prefix="/checkins", tags=["Check-ins"])
app.include_router(risk_scores.router, prefix="/risk-scores", tags=["Risk Scores"])
app.include_router(analytics.router)
app.include_router(forum.router)

@app.get("/")
async def root():
    return {"message": "PsyUnit API is running"}
