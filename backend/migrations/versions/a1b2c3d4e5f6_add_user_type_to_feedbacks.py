"""add user_type to feedbacks

Revision ID: a1b2c3d4e5f6
Revises: e8f9a0b1c2d3
Create Date: 2026-06-08 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('feedbacks', sa.Column('user_type', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('feedbacks', 'user_type')
