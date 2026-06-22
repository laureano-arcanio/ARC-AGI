from datetime import datetime

from pydantic import EmailStr, Field

from app.models.user import UserRole
from app.types.base import BaseAPISchema


class UserCreate(BaseAPISchema):
    email: EmailStr
    password: str
    role: UserRole = Field(default=UserRole.SOLVER)


class UserLogin(BaseAPISchema):
    email: str
    password: str


class UserUpdate(BaseAPISchema):
    role: UserRole | None = None


class UserPasswordUpdate(BaseAPISchema):
    password: str


class UserRead(BaseAPISchema):
    id: int
    email: str
    role: UserRole
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LoginResponse(BaseAPISchema):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
