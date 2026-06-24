"""Remove comment from review_tag and overall_notes from review

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("review_tag", "comment")
    op.drop_column("review", "overall_notes")


def downgrade() -> None:
    op.add_column(
        "review",
        sa.Column("overall_notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "review_tag",
        sa.Column("comment", sa.Text(), nullable=True),
    )
