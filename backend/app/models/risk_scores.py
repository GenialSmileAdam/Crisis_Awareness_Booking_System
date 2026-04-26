from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RiskTier(str, enum.Enum):
    green = "green"
    amber = "amber"
    red = "red"
    critical = "critical"


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id"), nullable=False, index=True
    )
    wrs_score: Mapped[float] = mapped_column(Float, nullable=False)
    tier: Mapped[RiskTier] = mapped_column(
        Enum(RiskTier, native_enum=False, validate_strings=True),
        nullable=False,
        index=True,
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
