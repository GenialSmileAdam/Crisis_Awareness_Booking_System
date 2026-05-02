from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssessmentBase(BaseModel):
    student_id: UUID
    type: str = Field(..., pattern="^(PHQ-9|GAD-7)$")  # Enum-like validation
    total_score: int = Field(ge=0)
    responses: Optional[dict[str, Any]] = None


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    type: Optional[str] = Field(None, pattern="^(PHQ-9|GAD-7)$")
    total_score: Optional[int] = Field(None, ge=0)
    responses: Optional[dict[str, Any]] = None


class AssessmentResponse(AssessmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
