"""Replace uuid with email and password_hash on user table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-21 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("email", sa.String(), nullable=True),
    )
    op.execute(
        "UPDATE \"user\" SET email = 'user_' || id::text || '@example.com'"
    )
    op.alter_column("user", "email", nullable=False)
    op.create_unique_constraint("uq_user_email", "user", ["email"])

    op.add_column(
        "user",
        sa.Column("password_hash", sa.String(), nullable=True),
    )
    op.execute("UPDATE \"user\" SET password_hash = ''")
    op.alter_column("user", "password_hash", nullable=False)

    op.drop_constraint("uq_user_uuid", "user", type_="unique")
    op.drop_column("user", "uuid")


def downgrade() -> None:
    op.add_column(
        "user",
        sa.Column("uuid", sa.String(), nullable=True),
    )
    op.execute(
        "UPDATE \"user\" SET uuid = gen_random_uuid()::text WHERE uuid IS NULL"
    )
    op.alter_column("user", "uuid", nullable=False)
    op.create_unique_constraint("uq_user_uuid", "user", ["uuid"])

    op.drop_constraint("uq_user_email", "user", type_="unique")
    op.drop_column("user", "email")
    op.drop_column("user", "password_hash")
