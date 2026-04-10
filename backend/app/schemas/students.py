from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StudentCreate(BaseModel):
    student_id: str
    class_level: Optional[str] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class StudentUpdate(BaseModel):
    class_level: Optional[str] = None
    assigned_psychologist_id: Optional[UUID] = None
    crisis_flag: Optional[bool] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: str
    class_level: Optional[str] = None
    assigned_psychologist_id: Optional[UUID] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    crisis_flag: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    full_name: str
    email: str
    session_count: int = 0
