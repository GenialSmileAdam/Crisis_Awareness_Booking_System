"""add clinical_notes to students

Revision ID: h6i7j8k9l0m1
Revises: d1e2f3g4h5i6
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h6i7j8k9l0m1"
down_revision: Union[str, Sequence[str], None] = "d1e2f3g4h5i6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS clinical_notes TEXT"
    )


def downgrade() -> None:
    op.drop_column("students", "clinical_notes")
