from datetime import datetime
from typing import Any

from app.types.base import BaseAPISchema


class EventCreate(BaseAPISchema):
    user_id: int
    task_id: str
    attempt_id: int | None = None
    node_id: str
    parent_node_id: str | None = None
    trigger: dict[str, Any]
    state_snapshot: list[list[int]]
    timestamp: int


class EventUpdate(BaseAPISchema):
    pass


class EventRead(BaseAPISchema):
    id: int
    user_id: int
    task_id: str
    attempt_id: int | None = None
    node_id: str
    parent_node_id: str | None = None
    trigger: dict[str, Any]
    state_snapshot: list[list[int]]
    timestamp: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
