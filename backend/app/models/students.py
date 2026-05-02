from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.appointments import Appointment
    from app.models.crisis_logs import CrisisLog
    from app.models.staff import Staff

class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    class_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_psychologist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff.user_id"),
        nullable=True,
    )
    guidance_counselor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    crisis_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="student")
    crisis_logs: Mapped[list["CrisisLog"]] = relationship("CrisisLog", back_populates="student")
    assigned_psychologist: Mapped[Optional["Staff"]] = relationship(
        "Staff",
        foreign_keys=[assigned_psychologist_id],
        back_populates="assigned_students",
    )
