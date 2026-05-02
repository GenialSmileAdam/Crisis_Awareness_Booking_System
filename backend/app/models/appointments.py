from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.students import Student
    from app.models.crisis_logs import CrisisLog
    from app.models.staff import Staff


class AppointmentStatus(str, enum.Enum):
    booked = "booked"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class BookingSource(str, enum.Enum):
    student_portal = "student_portal"
    psychologist_manual = "psychologist_manual"
    walk_in = "walk_in"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("students.student_id"),
        nullable=False,
    )
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff.user_id"),
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(nullable=False, default=AppointmentStatus.booked)
    is_crisis: Mapped[bool] = mapped_column(nullable=False, default=False)
    crisis_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    booking_source: Mapped[BookingSource] = mapped_column(nullable=False)
    calendar_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    student: Mapped["Student"] = relationship("Student", back_populates="appointments")
    psychologist: Mapped["Staff"] = relationship(
        "Staff",
        back_populates="appointments",
        foreign_keys=[psychologist_id],
    )
    crisis_logs: Mapped[list["CrisisLog"]] = relationship("CrisisLog", back_populates="appointment")
