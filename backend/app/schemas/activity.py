from app.types.base import BaseAPISchema


class TimelineBucket(BaseAPISchema):
    bucket: str
    count: int


class EventTypeSummary(BaseAPISchema):
    type: str
    count: int


class ActivityStats(BaseAPISchema):
    timeline: list[TimelineBucket]
    last_event_timestamp: int | None = None
    active_users: int = 0
    event_type_summary: list[EventTypeSummary]
    total_events: int = 0


class TaskSolveStats(BaseAPISchema):
    task_id: str
    avg_time_ms: float
    min_time_ms: int
    max_time_ms: int
    p95_time_ms: int
    completed_count: int


class BatchSolveBreakdown(BaseAPISchema):
    batch_id: int
    batch_name: str
    tasks: list[TaskSolveStats]


class ActivityBatchBreakdown(BaseAPISchema):
    batches: list[BatchSolveBreakdown]
