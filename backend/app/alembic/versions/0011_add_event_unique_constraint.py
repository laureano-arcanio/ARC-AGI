"""Add unique constraint on event (attempt_id, node_id, test_pair_index)

Prevents duplicate event rows when frontend re-sends events on page refresh.

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-24 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_event_attempt_node_test",
        "event",
        ["attempt_id", "node_id", "test_pair_index"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_event_attempt_node_test",
        "event",
        type_="unique",
    )
