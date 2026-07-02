from datetime import datetime

from app.types.base import BaseAPISchema


class BatchCreate(BaseAPISchema):
    name: str
    task_ids: list[str]


class BatchUpdate(BaseAPISchema):
    name: str | None = None
    task_ids: list[str] | None = None


class BatchRead(BaseAPISchema):
    id: int
    name: str
    task_ids: list[str]
    assigned_user_ids: list[int] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BatchLeaderboardEntry(BaseAPISchema):
    email: str
    user_id: int
    total_time_ms: int
    avg_time_ms: float
    total_actions: int
    avg_actions: float
