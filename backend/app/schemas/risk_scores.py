from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.risk_scores import RiskTier


class RiskScoreBase(BaseModel):
    student_id: str
    wrs_score: float = Field(ge=0, le=100)
    tier: RiskTier


class RiskScoreCreate(RiskScoreBase):
    pass


class RiskScoreResponse(RiskScoreBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    computed_at: datetime
