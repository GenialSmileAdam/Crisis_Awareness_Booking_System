from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.risk_scores import RiskTier


class RiskOverride(Base):
    __tablename__ = "risk_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id"), nullable=False
    )
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("staff.user_id"), nullable=False
    )
    override_tier: Mapped[RiskTier] = mapped_column(
        Enum(RiskTier, native_enum=False, validate_strings=True), nullable=False
    )
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
