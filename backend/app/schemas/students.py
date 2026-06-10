from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict



class StudentBase(BaseModel):
    student_id: str
    full_name: str
    email: str
    faculty: Optional[str] = None
    department: Optional[str] = None
    year_group: Optional[int] = None
    consent_status: bool = True
    class_level: Optional[str] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    student_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    year_group: Optional[int] = None
    consent_status: Optional[bool] = None
    class_level: Optional[str] = None
    assigned_psychologist_id: Optional[UUID] = None
    crisis_flag: Optional[bool] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    clinical_notes: Optional[str] = None


class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    assigned_psychologist_id: Optional[UUID] = None
    crisis_flag: bool
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    session_count: int = 0
