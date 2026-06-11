from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional, List

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, JSON, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CarePlan(Base):
    """A treatment / care plan for a student, with structured goals."""

    __tablename__ = "care_plans"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # goals: [{ "text": str, "done": bool }]
    goals: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active | closed
    review_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SafetyPlan(Base):
    """A crisis safety plan. One current plan per student (upserted)."""

    __tablename__ = "safety_plans"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    warning_signs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    coping_strategies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reasons_to_live: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # support_contacts: [{ "name": str, "phone": str, "relation": str }]
    support_contacts: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True, default=list)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SessionActionItem(Base):
    """A follow-up action tied to a session — AI-suggested or manually added."""

    __tablename__ = "session_action_items"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")  # manual | ai
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Referral(Base):
    """A referral of a student to another service / specialist."""

    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    referred_to: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open | accepted | completed
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
