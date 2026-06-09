"""add is_active to students

Revision ID: d1e2f3g4h5i6
Revises: c1d2e3f4g5h6
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3g4h5i6"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4g5h6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
    )


def downgrade() -> None:
    op.drop_column("students", "is_active")
