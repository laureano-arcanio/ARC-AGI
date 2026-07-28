from typing import Any

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models import AbstractBase


class TaskTag(AbstractBase):
    __tablename__ = "task_tag"

    task_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    scope_type: Mapped[str] = mapped_column(String, nullable=False)
    pair_type: Mapped[str | None] = mapped_column(String, nullable=True)
    pair_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grid_type: Mapped[str | None] = mapped_column(String, nullable=True)
    selected_cells: Mapped[list[Any] | None] = mapped_column(
        JSON, nullable=True
    )
    mask: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    labels: Mapped[list[Any]] = mapped_column(JSON, nullable=False)


class TaskTagRelation(AbstractBase):
    __tablename__ = "task_tag_relation"

    task_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    from_tag_id: Mapped[int] = mapped_column(
        ForeignKey("task_tag.id", ondelete="CASCADE"), nullable=False
    )
    to_tag_id: Mapped[int] = mapped_column(
        ForeignKey("task_tag.id", ondelete="CASCADE"), nullable=False
    )
    labels: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
