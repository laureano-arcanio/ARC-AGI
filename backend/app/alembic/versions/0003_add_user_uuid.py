"""Add uuid column to user table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-20 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("uuid", sa.String(), nullable=True),
    )
    op.execute("UPDATE \"user\" SET uuid = gen_random_uuid()::text WHERE uuid IS NULL")
    op.alter_column("user", "uuid", nullable=False)
    op.create_unique_constraint("uq_user_uuid", "user", ["uuid"])


def downgrade() -> None:
    op.drop_constraint("uq_user_uuid", "user", type_="unique")
    op.drop_column("user", "uuid")
