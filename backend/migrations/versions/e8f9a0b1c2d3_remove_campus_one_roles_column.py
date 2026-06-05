"""Remove campus_one_roles column - use roles array from JWT directly

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-06-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, Sequence[str], None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove campus_one_roles column from users table."""
    op.drop_column('users', 'campus_one_roles')


def downgrade() -> None:
    """Add campus_one_roles column back to users table."""
    op.add_column(
        'users',
        sa.Column(
            'campus_one_roles',
            sa.JSON(),
            nullable=False,
            server_default='[]'
        )
    )
