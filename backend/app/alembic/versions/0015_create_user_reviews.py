"""Create user_review table

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-31 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_review",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("synth_task_id", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.String(),
            server_default="pending_review",
            nullable=False,
        ),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column(
            "verified",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("notes", sa.JSON(), server_default="[]", nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "synth_task_id", name="uq_user_review_user_task"
        ),
    )
    op.create_index("ix_user_review_id", "user_review", ["id"])
    op.create_index("ix_user_review_user_id", "user_review", ["user_id"])
    op.create_index(
        "ix_user_review_synth_task_id", "user_review", ["synth_task_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_user_review_synth_task_id", table_name="user_review")
    op.drop_index("ix_user_review_user_id", table_name="user_review")
    op.drop_index("ix_user_review_id", table_name="user_review")
    op.drop_table("user_review")
