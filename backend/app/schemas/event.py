from datetime import datetime
from typing import Any

from app.types.base import BaseAPISchema


class EventCreate(BaseAPISchema):
    user_id: int
    task_id: str
    attempt_id: int | None = None
    node_id: str
    parent_node_id: str | None = None
    test_pair_index: int | None = None
    trigger: dict[str, Any]
    state_snapshot: list[list[int]]
    timestamp: int
    sequence_index: int | None = None


class EventSubmitCreate(BaseAPISchema):
    user_id: int
    task_id: str
    attempt_id: int
    node_id: str
    parent_node_id: str | None = None
    test_pair_index: int | None = None
    # Submitted output grid per test pair index. Validated server-side against
    # the stored solutions; the client never reports correctness itself.
    grids: dict[int, list[list[int]]]
    state_snapshot: list[list[int]]
    timestamp: int
    sequence_index: int | None = None


class EventUpdate(BaseAPISchema):
    pass


class EventRead(BaseAPISchema):
    id: int
    user_id: int
    task_id: str
    attempt_id: int | None = None
    node_id: str
    parent_node_id: str | None = None
    test_pair_index: int | None = None
    trigger: dict[str, Any]
    state_snapshot: list[list[int]]
    timestamp: int
    sequence_index: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EventCrossRead(BaseAPISchema):
    id: int
    task_id: str
    attempt_id: int | None = None
    node_id: str
    parent_node_id: str | None = None
    test_pair_index: int | None = None
    trigger: dict[str, Any]
    state_snapshot: list[list[int]]
    timestamp: int
    sequence_index: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
