"""add availability date and staff session duration

Revision ID: 56f8a3d2b1c4
Revises: c9f87335b6fb
Create Date: 2026-06-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "56f8a3d2b1c4"
down_revision: Union[str, Sequence[str], None] = "c9f87335b6fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "staff",
        sa.Column(
            "session_duration_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("45"),
        ),
    )

    op.add_column(
        "psychologist_availability",
        sa.Column(
            "date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
    )
    op.execute("UPDATE psychologist_availability SET date = CURRENT_DATE WHERE date IS NULL")
    op.execute("ALTER TABLE psychologist_availability DROP CONSTRAINT IF EXISTS ck_availability_day_of_week")
    op.execute("DROP INDEX IF EXISTS idx_availability_psychologist")
    op.execute(
        "DELETE FROM psychologist_availability a USING psychologist_availability b "
        "WHERE a.ctid > b.ctid "
        "AND a.psychologist_id = b.psychologist_id "
        "AND a.date = b.date "
        "AND a.start_time = b.start_time "
        "AND a.end_time = b.end_time"
    )
    op.execute("ALTER TABLE psychologist_availability DROP COLUMN IF EXISTS day_of_week")
    op.execute("ALTER TABLE psychologist_availability DROP COLUMN IF EXISTS is_available")
    op.create_unique_constraint(
        "uq_availability_block",
        "psychologist_availability",
        ["psychologist_id", "date", "start_time", "end_time"],
    )
    op.create_index(
        "idx_availability_psychologist_date",
        "psychologist_availability",
        ["psychologist_id", "date", "start_time", "end_time"],
        unique=False,
    )

    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'pending'")
    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'confirmed'")
    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'rejected'")

    op.execute("ALTER TABLE appointments DROP COLUMN IF EXISTS pending_approval")


def downgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column(
            "pending_approval",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.drop_constraint("uq_availability_block", "psychologist_availability", type_="unique")
    op.drop_index("idx_availability_psychologist_date", table_name="psychologist_availability")
    op.add_column(
        "psychologist_availability",
        sa.Column(
            "day_of_week",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "psychologist_availability",
        sa.Column(
            "is_available",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.create_index(
        "idx_availability_psychologist",
        "psychologist_availability",
        ["psychologist_id", "day_of_week"],
        unique=False,
    )
    op.create_check_constraint(
        "ck_availability_day_of_week",
        "psychologist_availability",
        "day_of_week BETWEEN 0 AND 6",
    )
    op.drop_column("psychologist_availability", "date")

    op.drop_column("staff", "session_duration_minutes")

    op.execute("ALTER TYPE appointmentstatus RENAME TO appointmentstatus_old")
    op.execute("CREATE TYPE appointmentstatus AS ENUM('booked','completed','cancelled','no_show')")
    op.execute(
        "ALTER TABLE appointments ALTER COLUMN status TYPE appointmentstatus USING status::text::appointmentstatus"
    )
    op.execute("DROP TYPE appointmentstatus_old")
