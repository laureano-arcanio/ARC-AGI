from sqlalchemy.orm import Mapped, mapped_column

from app.models import AbstractBase


class ExampleTable(AbstractBase):
    __tablename__ = "example_table"

    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
