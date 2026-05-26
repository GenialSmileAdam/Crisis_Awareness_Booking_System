"""add schema expansion columns

Revision ID: a3b7c2d5e8f1
Revises: f4f1d83b529a
Create Date: 2026-05-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a3b7c2d5e8f1"
down_revision: Union[str, Sequence[str], None] = "f4f1d83b529a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── students: demographic + academic fields ──────────────────
    op.add_column("students", sa.Column("faculty", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("department", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("program", sa.String(100), nullable=True))
    op.add_column("students", sa.Column("phone_number", sa.String(30), nullable=True))
    op.add_column("students", sa.Column("gender", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("year_of_study", sa.Integer(), nullable=True))
    op.create_index("idx_students_faculty", "students", ["faculty"])

    # ── appointments: approval flag + session details ────────────
    op.add_column("appointments", sa.Column(
        "pending_approval", sa.Boolean(), nullable=False,
        server_default=sa.text("false")
    ))
    op.add_column("appointments", sa.Column(
        "session_type", sa.String(20), nullable=False,
        server_default="in_person"
    ))
    op.add_column("appointments", sa.Column("location", sa.String(255), nullable=True))

    # Backfill: student_portal bookings were the pending ones
    op.execute(
        "UPDATE appointments SET pending_approval = true "
        "WHERE booking_source = 'student_portal' AND status = 'booked'"
    )

    # ── staff: profile completeness + work hours ─────────────────
    op.add_column("staff", sa.Column("office_location", sa.String(100), nullable=True))
    op.add_column("staff", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("staff", sa.Column("work_start_time", sa.Time(), nullable=True))
    op.add_column("staff", sa.Column("work_end_time", sa.Time(), nullable=True))

    # Default work hours for existing staff
    op.execute(
        "UPDATE staff SET work_start_time = '09:00:00', work_end_time = '17:00:00' "
        "WHERE work_start_time IS NULL"
    )

    # ── notifications: read state + title ───────────────────────
    op.add_column("notifications", sa.Column("title", sa.String(255), nullable=True))
    op.add_column("notifications", sa.Column(
        "read", sa.Boolean(), nullable=False, server_default=sa.text("false")
    ))

    # ── psychologist_availability ────────────────────────────────
    op.create_table(
        "psychologist_availability",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("psychologist_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["psychologist_id"], ["staff.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_availability_day_of_week"),
    )
    op.create_index("idx_availability_psychologist", "psychologist_availability", ["psychologist_id", "day_of_week"])

    # ── psychologist_busy_blocks ─────────────────────────────────
    op.create_table(
        "psychologist_busy_blocks",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("psychologist_id", sa.UUID(), nullable=False),
        sa.Column("block_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("block_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["psychologist_id"], ["staff.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_busy_blocks_psychologist_time", "psychologist_busy_blocks", ["psychologist_id", "block_start", "block_end"])

    # ── Additional performance indexes ───────────────────────────
    op.create_index("idx_risk_scores_student_computed", "risk_scores", ["student_id", "computed_at"])
    op.create_index("idx_checkins_student_submitted", "wellness_checkins", ["student_id", "submitted_at"])
    op.create_index("idx_appointments_student_id2", "appointments", ["student_id"])
    op.create_index("idx_appointments_psychologist_time", "appointments", ["psychologist_id", "start_time"])
    op.create_index("idx_notifications_user_read", "notifications", ["user_id", "read"])

    # ── Seed default Mon–Fri availability for existing psychologists
    op.execute("""
        INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time)
        SELECT s.user_id, d.day, '09:00:00'::time, '17:00:00'::time
        FROM staff s
        CROSS JOIN (VALUES (0),(1),(2),(3),(4)) AS d(day)
        WHERE s.staff_type = 'psychologist'
          AND NOT EXISTS (
              SELECT 1 FROM psychologist_availability pa
              WHERE pa.psychologist_id = s.user_id
          )
    """)


def downgrade() -> None:
    op.drop_table("psychologist_busy_blocks")
    op.drop_table("psychologist_availability")

    op.drop_column("notifications", "read")
    op.drop_column("notifications", "title")

    op.drop_column("staff", "work_end_time")
    op.drop_column("staff", "work_start_time")
    op.drop_column("staff", "bio")
    op.drop_column("staff", "office_location")

    op.drop_column("appointments", "location")
    op.drop_column("appointments", "session_type")
    op.drop_column("appointments", "pending_approval")

    op.drop_index("idx_students_faculty", table_name="students")
    op.drop_column("students", "year_of_study")
    op.drop_column("students", "gender")
    op.drop_column("students", "phone_number")
    op.drop_column("students", "program")
    op.drop_column("students", "department")
    op.drop_column("students", "faculty")
