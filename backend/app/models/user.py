import enum
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import AbstractBase

if TYPE_CHECKING:
    from app.models.batch import BatchAssignment


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    SOLVER = "solver"


class User(AbstractBase):
    __tablename__ = "user"

    email: Mapped[str] = mapped_column(
        String, unique=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String, nullable=False
    )
    role: Mapped[str] = mapped_column(
        String, default=UserRole.SOLVER, nullable=False
    )

    batch_assignments: Mapped[list["BatchAssignment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
