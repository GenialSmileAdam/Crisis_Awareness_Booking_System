from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.risk_scores import RiskTier


class RiskOverrideBase(BaseModel):
    student_id: str
    psychologist_id: UUID
    override_tier: RiskTier
    justification: str


class RiskOverrideCreate(RiskOverrideBase):
    pass


class RiskOverrideResponse(RiskOverrideBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
