import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.routers import (
    analytics,
    appointments,
    auth,
    availability,
    checkins,
    consent,
    forum,
    notifications,
    risk_scores,
    staff,
    students,
    users,
    feedback,
    config,
    clinical,
    student_portal,
)
from app import models

from app.routers import session_ai

# Configure logging to show all debug info
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

# Set specific loggers
logging.getLogger("app.core.campus_one_oidc").setLevel(logging.INFO)
logging.getLogger("app.routers.auth").setLevel(logging.INFO)
logging.getLogger("app.services").setLevel(logging.INFO)
logging.getLogger("uvicorn").setLevel(logging.INFO)

app = FastAPI(
    title="PsyUnit API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # Match Vercel preview deployments (e.g. project-git-branch-team.vercel.app)
    # so previews don't hit CORS errors. Credentialed CORS still echoes the
    # specific matched origin, never "*".
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(availability.router)
app.include_router(forum.router)
app.include_router(feedback.router)
app.include_router(notifications.router)
app.include_router(config.router)
app.include_router(clinical.router)
app.include_router(student_portal.router)

@app.get("/")
async def root():
    return {"message": "PsyUnit API is running"}


from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database connection or operation failed: {exc}")
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "The database service is currently unavailable. Please try again later."
            }
        }
    )
