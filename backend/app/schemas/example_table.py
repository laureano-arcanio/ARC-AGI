from datetime import datetime

from app.types.base import BaseAPISchema


class ExampleTableCreate(BaseAPISchema):
    name: str
    description: str | None = None


class ExampleTableUpdate(BaseAPISchema):
    name: str | None = None
    description: str | None = None


class ExampleTableRead(BaseAPISchema):
    id: int
    name: str
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
