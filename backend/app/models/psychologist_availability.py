from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Time, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PsychologistAvailability(Base):
    """Recurring weekly availability windows for a psychologist.
    day_of_week: 0=Monday … 6=Sunday
    """
    __tablename__ = "psychologist_availability"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PsychologistBusyBlock(Base):
    """One-off busy periods that override the recurring availability."""
    __tablename__ = "psychologist_busy_blocks"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    block_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
