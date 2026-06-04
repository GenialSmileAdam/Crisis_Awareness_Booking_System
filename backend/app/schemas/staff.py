from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.staff import StaffType


class StaffCreate(BaseModel):
    email: str
    password: str
    full_name: str
    staff_id: str
    staff_type: StaffType
    department: Optional[str] = None
    hire_date: Optional[date] = None
    specialization: Optional[str] = None
    max_appointments_per_day: int = 8
    session_duration_minutes: int = 45
    is_admin: bool = False


class StaffUpdate(BaseModel):
    department: Optional[str] = None
    specialization: Optional[str] = None
    max_appointments_per_day: Optional[int] = None
    session_duration_minutes: Optional[int] = None
    is_admin: Optional[bool] = None


class StaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    staff_id: str
    staff_type: StaffType
    department: Optional[str] = None
    hire_date: Optional[date] = None
    specialization: Optional[str] = None
    max_appointments_per_day: int
    session_duration_minutes: int
    is_admin: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    full_name: str
    email: str
