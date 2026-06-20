"""
Database models for the application.

This module defines the SQLAlchemy ORM models that represent the database schema.
It includes an abstract base class for common model attributes and imports all
model classes to make them available through the models package.
"""

from sqlalchemy import (
    Column,
    DateTime,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class AbstractBase(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)

    created_at = Column(DateTime(timezone=True), default=func.now())

    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )


from app.models.event import Event  # noqa: E402, F401
from app.models.example_table import ExampleTable  # noqa: E402, F401
from app.models.user import User  # noqa: E402, F401
