"""Create review tables (peer_review_pair, review, review_tag)

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "peer_review_pair",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("solver_a_id", sa.Integer(), nullable=False),
        sa.Column("solver_b_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["solver_a_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["solver_b_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "solver_a_id", "solver_b_id", name="uq_peer_review_pair"
        ),
    )
    op.create_index(
        op.f("ix_peer_review_pair_id"), "peer_review_pair", ["id"]
    )

    op.create_table(
        "review",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewer_id", sa.Integer(), nullable=False),
        sa.Column("solver_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="assigned"),
        sa.Column("overall_notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["reviewer_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["solver_id"], ["user.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "reviewer_id",
            "solver_id",
            "task_id",
            name="uq_review_reviewer_solver_task",
        ),
    )
    op.create_index(op.f("ix_review_id"), "review", ["id"])

    op.create_table(
        "review_tag",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_id", sa.Integer(), nullable=False),
        sa.Column("solver_node_id", sa.String(), nullable=False),
        sa.Column("quality", sa.String(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["review_id"], ["review.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_review_tag_id"), "review_tag", ["id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_review_tag_id"), table_name="review_tag")
    op.drop_table("review_tag")
    op.drop_index(op.f("ix_review_id"), table_name="review")
    op.drop_table("review")
    op.drop_index(
        op.f("ix_peer_review_pair_id"), table_name="peer_review_pair"
    )
    op.drop_table("peer_review_pair")
