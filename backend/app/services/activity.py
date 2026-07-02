import time

from app.repositories.event import EventRepository
from app.schemas.activity import ActivityStats, EventTypeSummary, TimelineBucket


class ActivityService:
    def __init__(self, event_repo: EventRepository) -> None:
        self.repo = event_repo

    async def get_stats(
        self, event_types: list[str] | None = None
    ) -> ActivityStats:
        now_ms = int(time.time() * 1000)
        since_24h = now_ms - 24 * 3600 * 1000
        since_5m = now_ms - 5 * 60 * 1000

        rows = await self.repo.get_timeline(event_types, since_24h)
        timeline = [
            TimelineBucket(bucket=r.bucket.isoformat(), count=r.count)
            for r in rows
        ]

        last_ts = await self.repo.get_last_event_timestamp()

        active = await self.repo.get_active_users_count(since_5m)

        summary_rows = await self.repo.get_event_type_summary(
            event_types, since_24h
        )
        summary = [
            EventTypeSummary(type=r.type, count=r.count)
            for r in summary_rows
        ]

        total = sum(b.count for b in timeline)

        return ActivityStats(
            timeline=timeline,
            last_event_timestamp=last_ts,
            active_users=active,
            event_type_summary=summary,
            total_events=total,
        )
