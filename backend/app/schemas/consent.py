from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ConsentBase(BaseModel):
    student_id: str
    monitoring_enabled: bool = True


class ConsentCreate(ConsentBase):
    pass


class ConsentUpdate(BaseModel):
    monitoring_enabled: Optional[bool] = None


class ConsentResponse(ConsentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    updated_at: datetime
