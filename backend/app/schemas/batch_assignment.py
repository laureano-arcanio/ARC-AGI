from datetime import datetime

from app.types.base import BaseAPISchema


class BatchAssignmentCreate(BaseAPISchema):
    batch_id: int
    user_id: int


class BatchAssignmentRead(BaseAPISchema):
    id: int
    batch_id: int
    user_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BatchAssignmentDelete(BaseAPISchema):
    batch_id: int
    user_id: int
