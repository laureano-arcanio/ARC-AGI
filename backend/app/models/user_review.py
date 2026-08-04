from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import AbstractBase

if TYPE_CHECKING:
    from app.models.user import User


class UserReview(AbstractBase):
    __tablename__ = "user_review"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "synth_task_id", name="uq_user_review_user_task"
        ),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    synth_task_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String, nullable=False, default="pending_review"
    )
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="user_reviews")
