from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import AbstractBase

if TYPE_CHECKING:
    from app.models.user import User


class Batch(AbstractBase):
    __tablename__ = "batch"

    name: Mapped[str] = mapped_column(String, nullable=False)
    task_ids: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)

    assignments: Mapped[list["BatchAssignment"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )


class BatchAssignment(AbstractBase):
    __tablename__ = "batch_assignment"
    __table_args__ = (
        UniqueConstraint("batch_id", "user_id", name="uq_batch_assignment_batch_user"),
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey("batch.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    batch: Mapped["Batch"] = relationship(back_populates="assignments")
    user: Mapped["User"] = relationship(back_populates="batch_assignments")
