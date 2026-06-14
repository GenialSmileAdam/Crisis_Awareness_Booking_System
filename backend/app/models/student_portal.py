from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, JSON, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StudentPreferences(Base):
    """Per-student portal preferences (one row per student, upserted).

    The ``data`` blob is deep-merged over service defaults, so new preference
    keys can be added without a migration. Holds notification/reminder settings,
    appearance (theme, reduced motion, text size) and saved resource ids.
    """

    __tablename__ = "student_preferences"

    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id", ondelete="CASCADE"), primary_key=True
    )
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class WellnessGoal(Base):
    """A personal wellness goal a student sets for themselves."""

    __tablename__ = "wellness_goals"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # Optional numeric target + progress (e.g. "meditate 10 times"). 0 target = simple done/not-done.
    target: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | done | archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
