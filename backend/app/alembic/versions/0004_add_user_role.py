"""Add role column to user table

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "role",
            sa.String(),
            nullable=False,
            server_default="solver",
        ),
    )


def downgrade() -> None:
    op.drop_column("user", "role")
