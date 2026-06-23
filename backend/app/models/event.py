from typing import Any

from sqlalchemy import JSON, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models import AbstractBase


class Event(AbstractBase):
    __tablename__ = "event"

    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    task_id: Mapped[str] = mapped_column(nullable=False)
    attempt_id: Mapped[int | None] = mapped_column(
        ForeignKey("attempt.id"), nullable=True
    )
    node_id: Mapped[str] = mapped_column(nullable=False)
    parent_node_id: Mapped[str | None] = mapped_column(nullable=True)
    test_pair_index: Mapped[int | None] = mapped_column(nullable=True)
    trigger: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    state_snapshot: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
    timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False)
