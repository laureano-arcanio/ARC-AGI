"""Add test_pair_index column to event table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-23 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event",
        sa.Column("test_pair_index", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event", "test_pair_index")
