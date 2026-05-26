"""fix session_type column to native enum

Revision ID: b9e4f1a2c3d6
Revises: a3b7c2d5e8f1
Create Date: 2026-05-26 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b9e4f1a2c3d6"
down_revision: Union[str, Sequence[str], None] = "a3b7c2d5e8f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

sessiontype_enum = postgresql.ENUM("in_person", "virtual", name="sessiontype", create_type=False)


def upgrade() -> None:
    # Create the native PostgreSQL enum type
    op.execute("CREATE TYPE sessiontype AS ENUM ('in_person', 'virtual')")

    # Drop server default before altering type (PG can't auto-cast string defaults to enum)
    op.execute("ALTER TABLE appointments ALTER COLUMN session_type DROP DEFAULT")

    # Convert the VARCHAR(20) column to the native enum type
    op.execute(
        "ALTER TABLE appointments "
        "ALTER COLUMN session_type TYPE sessiontype "
        "USING session_type::sessiontype"
    )

    # Restore default using the enum value
    op.execute("ALTER TABLE appointments ALTER COLUMN session_type SET DEFAULT 'in_person'::sessiontype")


def downgrade() -> None:
    op.execute("ALTER TABLE appointments ALTER COLUMN session_type DROP DEFAULT")
    op.execute(
        "ALTER TABLE appointments "
        "ALTER COLUMN session_type TYPE VARCHAR(20) "
        "USING session_type::text"
    )
    op.execute("ALTER TABLE appointments ALTER COLUMN session_type SET DEFAULT 'in_person'")
    op.execute("DROP TYPE sessiontype")
