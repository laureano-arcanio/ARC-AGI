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
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserTaskSummary(BaseAPISchema):
    task_id: str
    attempt_count: int
    solved: bool


class TaskWithStatus(BaseAPISchema):
    task_id: str
    attempt_count: int
    solved: bool
    status: str  # "not_started" | "started" | "completed"
    reviewed: bool = False
    reviewer_emails: list[str] = []


class BatchWithTasks(BaseAPISchema):
    batch_id: int
    batch_name: str
    tasks: list[TaskWithStatus]
