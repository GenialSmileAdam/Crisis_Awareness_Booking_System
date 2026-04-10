from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.appointments import AppointmentStatus, BookingSource


class AppointmentCreate(BaseModel):
    student_id: str
    psychologist_id: UUID
    start_time: datetime
    end_time: datetime
    is_crisis: bool = False
    crisis_note: Optional[str] = None
    booking_source: BookingSource

    @model_validator(mode="after")
    def validate_times(self) -> "AppointmentCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    crisis_note: Optional[str] = None

    @model_validator(mode="after")
    def validate_times(self) -> "AppointmentUpdate":
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: str
    psychologist_id: UUID
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    is_crisis: bool
    crisis_note: Optional[str] = None
    booking_source: BookingSource
    calendar_event_id: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    student_full_name: str
    psychologist_full_name: str
    session_summary: Optional[str] = Field(default=None)
