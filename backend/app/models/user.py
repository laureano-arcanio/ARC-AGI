import enum
import uuid as _uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models import AbstractBase


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    SOLVER = "solver"


class User(AbstractBase):
    __tablename__ = "user"

    uuid: Mapped[str] = mapped_column(
        unique=True, nullable=False, default=lambda: str(_uuid.uuid4())
    )
    role: Mapped[str] = mapped_column(
        String, default=UserRole.SOLVER, nullable=False
    )
