"""Add campus_one_roles JSON field to users table for OIDC authorization

Revision ID: d7e8f9a0b1c2
Revises: 7e2b1c4d5a6f
Create Date: 2026-06-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "7e2b1c4d5a6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add campus_one_roles JSON column to users table."""
    op.add_column(
        'users',
        sa.Column(
            'campus_one_roles',
            sa.JSON(),
            nullable=False,
            server_default='[]'
        )
    )


def downgrade() -> None:
    """Remove campus_one_roles column from users table."""
    op.drop_column('users', 'campus_one_roles')
