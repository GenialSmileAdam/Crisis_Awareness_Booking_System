from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.wellness_checkins import WellnessCheckinType


class WellnessCheckinBase(BaseModel):
    student_id: str
    type: WellnessCheckinType
    responses: dict[str, Any]
    score: Optional[int] = None
    severity_label: Optional[str] = None


class WellnessCheckinCreate(WellnessCheckinBase):
    pass


class WellnessCheckinResponse(WellnessCheckinBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submitted_at: datetime
