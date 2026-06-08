"""add psychologist weekly schedule table

Revision ID: c1d2e3f4g5h6
Revises: b2c3d4e5f6a7
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "c1d2e3f4g5h6"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "psychologist_weekly_schedule",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "psychologist_id",
            UUID(as_uuid=True),
            sa.ForeignKey("staff.user_id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("psychologist_weekly_schedule")
