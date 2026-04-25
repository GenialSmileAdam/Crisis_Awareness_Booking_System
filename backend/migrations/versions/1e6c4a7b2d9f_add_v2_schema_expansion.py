"""add v2 schema expansion

Revision ID: 1e6c4a7b2d9f
Revises: f53b96401f6b
Create Date: 2026-04-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "1e6c4a7b2d9f"
down_revision: Union[str, Sequence[str], None] = "f53b96401f6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "wellness_checkins",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "pulse",
                "phq9",
                "gad7",
                "event_triggered",
                "crisis",
                name="wellnesscheckintype",
                native_enum=False,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("responses", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("severity_label", sa.String(length=50), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.student_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_wellness_checkins_student_id", "wellness_checkins", ["student_id"], unique=False
    )

    op.create_table(
        "risk_scores",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column("wrs_score", sa.Float(), nullable=False),
        sa.Column(
            "tier",
            sa.Enum(
                "green",
                "amber",
                "red",
                "critical",
                name="risktier",
                native_enum=False,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.student_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_risk_scores_student_id", "risk_scores", ["student_id"], unique=False)
    op.create_index("ix_risk_scores_tier", "risk_scores", ["tier"], unique=False)

    op.create_table(
        "risk_overrides",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column("psychologist_id", sa.UUID(), nullable=False),
        sa.Column(
            "override_tier",
            sa.Enum(
                "green",
                "amber",
                "red",
                "critical",
                name="risktier",
                native_enum=False,
                validate_strings=True,
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("justification", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["psychologist_id"], ["staff.user_id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.student_id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "resources",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "article",
                "video",
                "exercise",
                name="resourcetype",
                native_enum=False,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["staff.user_id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "forum_posts",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("encrypted_student_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delete_reason", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "consent",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column("monitoring_enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.student_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id"),
    )
    op.create_index("ix_consent_student_id", "consent", ["student_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_consent_student_id", table_name="consent")
    op.drop_table("consent")
    op.drop_table("forum_posts")
    op.drop_table("resources")
    op.drop_table("risk_overrides")
    op.drop_index("ix_risk_scores_tier", table_name="risk_scores")
    op.drop_index("ix_risk_scores_student_id", table_name="risk_scores")
    op.drop_table("risk_scores")
    op.drop_index("ix_wellness_checkins_student_id", table_name="wellness_checkins")
    op.drop_table("wellness_checkins")
