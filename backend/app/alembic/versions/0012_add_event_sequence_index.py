"""Add sequence_index column to event table

Provides a monotonic ordering key independent of database id or timestamp.

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-30 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("event", sa.Column("sequence_index", sa.Integer(), nullable=True))
    op.create_index("ix_event_sequence", "event", ["attempt_id", "sequence_index"])


def downgrade() -> None:
    op.drop_index("ix_event_sequence", "event")
    op.drop_column("event", "sequence_index")
