"""Add campus_one_id to users table for OIDC integration

Revision ID: c4d5e6f7g8h9
Revises: b9e4f1a2c3d6
Create Date: 2026-05-26 12:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7g8h9"
down_revision: Union[str, Sequence[str], None] = "b9e4f1a2c3d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('campus_one_id', sa.String(255), nullable=True))
    op.create_index(op.f('ix_users_campus_one_id'), 'users', ['campus_one_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_campus_one_id'), table_name='users')
    op.drop_column('users', 'campus_one_id')
