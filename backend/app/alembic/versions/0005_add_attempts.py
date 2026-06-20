"""Add attempts table and attempt_id to events

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-20 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attempt",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attempt_id"), "attempt", ["id"])

    op.add_column(
        "event",
        sa.Column("attempt_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_event_attempt_id",
        "event",
        "attempt",
        ["attempt_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_event_attempt_id"), "event", ["attempt_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_event_attempt_id"), table_name="event")
    op.drop_constraint("fk_event_attempt_id", "event", type_="foreignkey")
    op.drop_column("event", "attempt_id")
    op.drop_index(op.f("ix_attempt_id"), table_name="attempt")
    op.drop_table("attempt")
