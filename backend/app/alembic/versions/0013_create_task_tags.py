"""Create task_tag and task_tag_relation tables

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-28 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_tag",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scope_type", sa.String(), nullable=False),
        sa.Column("pair_type", sa.String(), nullable=True),
        sa.Column("pair_index", sa.Integer(), nullable=True),
        sa.Column("grid_type", sa.String(), nullable=True),
        sa.Column("selected_cells", sa.JSON(), nullable=True),
        sa.Column("mask", sa.JSON(), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_tag_task_id", "task_tag", ["task_id"])

    op.create_table(
        "task_tag_relation",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "from_tag_id",
            sa.Integer(),
            sa.ForeignKey("task_tag.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_tag_id",
            sa.Integer(),
            sa.ForeignKey("task_tag.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_task_tag_relation_task_id", "task_tag_relation", ["task_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_task_tag_relation_task_id", "task_tag_relation")
    op.drop_table("task_tag_relation")
    op.drop_index("ix_task_tag_task_id", "task_tag")
    op.drop_table("task_tag")
