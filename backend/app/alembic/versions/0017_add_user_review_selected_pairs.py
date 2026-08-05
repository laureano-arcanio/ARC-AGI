"""Add selected_pairs to user_review

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_review",
        sa.Column("selected_pairs", sa.JSON, nullable=True),
    )
    op.execute(
        "UPDATE user_review SET selected_pairs = '[]' WHERE selected_pairs IS NULL"
    )
    op.alter_column("user_review", "selected_pairs", nullable=False)


def downgrade() -> None:
    op.drop_column("user_review", "selected_pairs")
