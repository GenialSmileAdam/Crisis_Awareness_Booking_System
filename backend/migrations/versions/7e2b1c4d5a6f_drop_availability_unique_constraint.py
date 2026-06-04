"""drop psychologist availability unique constraint

Revision ID: 7e2b1c4d5a6f
Revises: 56f8a3d2b1c4
Create Date: 2026-06-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7e2b1c4d5a6f"
down_revision: Union[str, Sequence[str], None] = "56f8a3d2b1c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE psychologist_availability DROP CONSTRAINT IF EXISTS uq_availability_block")


def downgrade() -> None:
    op.create_unique_constraint(
        "uq_availability_block",
        "psychologist_availability",
        ["psychologist_id", "date", "start_time", "end_time"],
    )
