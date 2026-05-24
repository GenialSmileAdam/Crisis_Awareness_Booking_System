from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.appointments import Appointment
    from app.models.students import Student

class StaffType(str, enum.Enum):
    psychologist = "psychologist"
    counselor = "counselor"
    administrator = "administrator"
    support_staff = "support_staff"


class Staff(Base):
    __tablename__ = "staff"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    staff_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    staff_type: Mapped[StaffType] = mapped_column(nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hire_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_appointments_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship(
        "Appointment",
        back_populates="psychologist",
        foreign_keys="Appointment.psychologist_id",
    )
    assigned_students: Mapped[list["Student"]] = relationship(
        "Student",
        back_populates="assigned_psychologist",
        foreign_keys="Student.assigned_psychologist_id",
    )
