from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.wellness_checkins import WellnessCheckinType


class WellnessCheckinBase(BaseModel):
    student_id: str
    type: WellnessCheckinType
    responses: dict[str, Any]
    score: Optional[int] = None
    severity_label: Optional[str] = None
    mood_score: Optional[int] = None  # From SQL: 1-5 scale
    stress_level: Optional[int] = None  # From SQL: 1-5 scale
    sleep_hours: Optional[int] = None  # From SQL


class WellnessCheckinCreate(WellnessCheckinBase):
    pass


class WellnessCheckinUpdate(BaseModel):
    type: Optional[WellnessCheckinType] = None
    responses: Optional[dict[str, Any]] = None
    score: Optional[int] = None
    severity_label: Optional[str] = None
    mood_score: Optional[int] = None
    stress_level: Optional[int] = None
    sleep_hours: Optional[int] = None


class WellnessCheckinResponse(WellnessCheckinBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submitted_at: datetime


# What the client sends to submit a test
class TestSubmission(BaseModel):
    student_id: Optional[str] = None  # Informational only — server uses JWT for auth
    test_type: WellnessCheckinType   # 'pulse', 'phq9', 'gad7', etc.
    responses: Dict[str, Any]        # answers to questions
    score: Optional[int] = None      # total score (0-27 for PHQ-9, etc.)


# What the API returns after submission
class TestResultResponse(BaseModel):
    student_id: str
    test_type: str
    wrs_score: float          # 0-100
    risk_tier: str            # green, amber, red, critical
    crisis_escalation_required: bool = False  # True if red or critical risk
