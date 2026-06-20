from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models import AbstractBase


class Attempt(AbstractBase):
    __tablename__ = "attempt"

    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    task_id: Mapped[str] = mapped_column(nullable=False)
