from datetime import datetime
from typing import Any

from app.types.base import BaseAPISchema


class TaskTagCreate(BaseAPISchema):
    task_id: str
    scope_type: str
    pair_type: str | None = None
    pair_index: int | None = None
    grid_type: str | None = None
    selected_cells: list[str] | None = None
    mask: list[list[Any]] | None = None
    labels: list[str]


class TaskTagUpdate(BaseAPISchema):
    labels: list[str]


class TaskTagRead(BaseAPISchema):
    id: int
    task_id: str
    user_id: int
    scope_type: str
    pair_type: str | None = None
    pair_index: int | None = None
    grid_type: str | None = None
    selected_cells: list[str] | None = None
    mask: list[list[Any]] | None = None
    labels: list[str]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TaskTagRelationCreate(BaseAPISchema):
    task_id: str
    from_tag_id: int
    to_tag_id: int
    labels: list[str]


class TaskTagRelationRead(BaseAPISchema):
    id: int
    task_id: str
    user_id: int
    from_tag_id: int
    to_tag_id: int
    labels: list[str]
    created_at: datetime | None = None
    updated_at: datetime | None = None
