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
