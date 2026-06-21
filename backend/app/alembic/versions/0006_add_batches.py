"""Add batches and batch_assignments tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-21 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "batch",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("task_ids", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_batch_id"), "batch", ["id"])

    op.create_table(
        "batch_assignment",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["batch_id"], ["batch.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "batch_id", "user_id", name="uq_batch_assignment_batch_user"
        ),
    )
    op.create_index(
        op.f("ix_batch_assignment_id"), "batch_assignment", ["id"]
    )
    op.create_index(
        op.f("ix_batch_assignment_user_id"), "batch_assignment", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_batch_assignment_user_id"), table_name="batch_assignment"
    )
    op.drop_index(
        op.f("ix_batch_assignment_id"), table_name="batch_assignment"
    )
    op.drop_table("batch_assignment")
    op.drop_index(op.f("ix_batch_id"), table_name="batch")
    op.drop_table("batch")
