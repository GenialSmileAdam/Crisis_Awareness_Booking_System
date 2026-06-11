"""fix_sessions_created_at_default

Revision ID: k9l0m1n2o3p4
Revises: j8k9l0m1n2o3
Create Date: 2026-06-11 06:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'k9l0m1n2o3p4'
down_revision: Union[str, Sequence[str], None] = 'j8k9l0m1n2o3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT NOW()")
    op.execute("UPDATE sessions SET created_at = NOW() WHERE created_at IS NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE sessions ALTER COLUMN created_at DROP DEFAULT")
