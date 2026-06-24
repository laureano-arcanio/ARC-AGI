from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import AbstractBase

if TYPE_CHECKING:
    from app.models.user import User


class PeerReviewPair(AbstractBase):
    __tablename__ = "peer_review_pair"
    __table_args__ = (
        UniqueConstraint(
            "solver_a_id", "solver_b_id", name="uq_peer_review_pair"
        ),
    )

    solver_a_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    solver_b_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    solver_a: Mapped["User"] = relationship(foreign_keys=[solver_a_id])
    solver_b: Mapped["User"] = relationship(foreign_keys=[solver_b_id])


class Review(AbstractBase):
    __tablename__ = "review"
    __table_args__ = (
        UniqueConstraint(
            "reviewer_id",
            "solver_id",
            "task_id",
            name="uq_review_reviewer_solver_task",
        ),
    )

    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    solver_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(
        String, nullable=False, default="assigned"
    )
    reviewer: Mapped["User"] = relationship(foreign_keys=[reviewer_id])
    solver: Mapped["User"] = relationship(foreign_keys=[solver_id])
    tags: Mapped[list["ReviewTag"]] = relationship(
        back_populates="review", cascade="all, delete-orphan"
    )


class ReviewTag(AbstractBase):
    __tablename__ = "review_tag"

    review_id: Mapped[int] = mapped_column(
        ForeignKey("review.id", ondelete="CASCADE"), nullable=False
    )
    solver_node_id: Mapped[str] = mapped_column(String, nullable=False)
    quality: Mapped[str] = mapped_column(String, nullable=False)

    review: Mapped["Review"] = relationship(back_populates="tags")
