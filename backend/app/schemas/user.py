from datetime import datetime

from pydantic import Field

from app.models.user import UserRole
from app.types.base import BaseAPISchema


class UserCreate(BaseAPISchema):
    role: UserRole = Field(default=UserRole.SOLVER)


class UserUpdate(BaseAPISchema):
    pass


class UserRead(BaseAPISchema):
    id: int
    uuid: str
    role: UserRole
    created_at: datetime | None = None
    updated_at: datetime | None = None
