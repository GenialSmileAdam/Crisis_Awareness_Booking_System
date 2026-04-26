from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class WellnessCheckinType(str, enum.Enum):
    pulse = "pulse"
    phq9 = "phq9"
    gad7 = "gad7"
    event_triggered = "event_triggered"
    crisis = "crisis"


class WellnessCheckin(Base):
    __tablename__ = "wellness_checkins"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id"), nullable=False, index=True
    )
    type: Mapped[WellnessCheckinType] = mapped_column(
        Enum(WellnessCheckinType, native_enum=False, validate_strings=True),
        nullable=False,
    )
    responses: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    severity_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
