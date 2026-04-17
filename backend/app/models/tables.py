import uuid

from sqlalchemy import Column, DateTime, Table, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.base import Base
from app.models.users import User

metadata = Base.metadata

users_table = User.__table__

sessions_table = Table(
    "sessions",
    metadata,
    Column("id", PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("appointment_id", PGUUID(as_uuid=True), nullable=False),
    Column("summary", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=True),
    extend_existing=True,
)
