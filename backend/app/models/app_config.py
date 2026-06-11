from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, JSON, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AppConfig(Base):
    """
    Single-row system configuration.

    Stores admin-tunable settings (WRS thresholds & weights, alert routing,
    auto-assignment) as a JSON blob so new keys can be added without a migration.
    Always read/written through `config_service`, which merges this partial blob
    over the canonical defaults.
    """

    __tablename__ = "app_config"

    # Fixed primary key — there is only ever one row (id = 1).
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
