from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.risk_scores import RiskTier


class RiskScoreBase(BaseModel):
    student_id: str
    wrs_score: float = Field(ge=0, le=100)
    tier: RiskTier
    wrs_value: Optional[float] = Field(None, ge=0, le=100)  # From SQL
    risk_tier: Optional[str] = None  # From SQL: Green|Amber|Red|Critical
    justification_log: Optional[str] = None  # From SQL


class RiskScoreCreate(RiskScoreBase):
    pass


class RiskScoreUpdate(BaseModel):
    wrs_score: Optional[float] = Field(None, ge=0, le=100)
    tier: Optional[RiskTier] = None
    wrs_value: Optional[float] = Field(None, ge=0, le=100)
    risk_tier: Optional[str] = None
    justification_log: Optional[str] = None


class RiskScoreResponse(RiskScoreBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    computed_at: datetime
