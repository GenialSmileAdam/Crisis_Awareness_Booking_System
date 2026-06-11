"""add app_config table

Revision ID: i7j8k9l0m1n2
Revises: h6i7j8k9l0m1
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "i7j8k9l0m1n2"
down_revision: Union[str, Sequence[str], None] = "h6i7j8k9l0m1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_config",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # Seed the single config row with an empty blob; the service merges over defaults.
    op.execute("INSERT INTO app_config (id, data) VALUES (1, '{}') ON CONFLICT (id) DO NOTHING")


def downgrade() -> None:
    op.drop_table("app_config")
