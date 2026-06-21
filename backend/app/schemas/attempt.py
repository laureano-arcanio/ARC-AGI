from datetime import datetime

from app.types.base import BaseAPISchema


class AttemptCreate(BaseAPISchema):
    user_id: int
    task_id: str


class AttemptUpdate(BaseAPISchema):
    pass


class AttemptRead(BaseAPISchema):
    id: int
    user_id: int
    task_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserTaskSummary(BaseAPISchema):
    task_id: str
    attempt_count: int
