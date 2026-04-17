import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class CrisisLog(Base):
    __tablename__ = "crisis_logs"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        nullable=True,
    )
    student_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("students.student_id"),
        nullable=False,
    )
    severity_level: Mapped[SeverityLevel] = mapped_column(nullable=False)
    action_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alert_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", back_populates="crisis_logs")
    student: Mapped["Student"] = relationship("Student", back_populates="crisis_logs")
