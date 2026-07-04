import time
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.batch import Batch, BatchAssignment
from app.models.event import Event
from app.models.user import User
from app.repositories.event import EventRepository
from app.schemas.activity import (
    ActivityBatchBreakdown,
    ActivityStats,
    BatchSolveBreakdown,
    EventTypeSummary,
    TaskSolveStats,
    TimelineBucket,
)


class ActivityService:
    def __init__(self, event_repo: EventRepository) -> None:
        self.repo = event_repo

    async def get_stats(
        self,
        event_types: list[str] | None = None,
        hours: int = 24,
    ) -> ActivityStats:
        now_ms = int(time.time() * 1000)
        since_n = now_ms - hours * 3600 * 1000
        since_5m = now_ms - 5 * 60 * 1000

        rows = await self.repo.get_timeline(event_types, since_n)
        timeline = [
            TimelineBucket(bucket=r.bucket.isoformat(), count=r.count)
            for r in rows
        ]

        last_ts = await self.repo.get_last_event_timestamp()

        active = await self.repo.get_active_users_count(since_5m)

        summary_rows = await self.repo.get_event_type_summary(
            event_types, since_n
        )
        summary = [
            EventTypeSummary(type=r.type, count=r.count)
            for r in summary_rows
            if r.type is not None
        ]

        total = sum(b.count for b in timeline)

        return ActivityStats(
            timeline=timeline,
            last_event_timestamp=last_ts,
            active_users=active,
            event_type_summary=summary,
            total_events=total,
        )

    async def get_batch_breakdown(self) -> ActivityBatchBreakdown:
        db: AsyncSession = self.repo.db_session

        batches_query = select(Batch).order_by(Batch.id)
        batches_result = await db.execute(batches_query)
        batches = list(batches_result.scalars().all())

        batches_data: list[BatchSolveBreakdown] = []
        for batch in batches:
            task_ids = list(batch.task_ids)
            if not task_ids:
                continue

            user_query = (
                select(User.id, User.email)
                .join(BatchAssignment, BatchAssignment.user_id == User.id)
                .where(BatchAssignment.batch_id == batch.id)
            )
            user_result = await db.execute(user_query)
            users = {row[0]: row[1] for row in user_result.all()}
            if not users:
                continue

            user_ids = list(users.keys())

            attempts_query = select(Attempt).where(
                Attempt.user_id.in_(user_ids),
                Attempt.task_id.in_(task_ids),
            )
            attempts_result = await db.execute(attempts_query)
            attempts = list(attempts_result.scalars().all())
            if not attempts:
                continue

            attempt_ids = [a.id for a in attempts]
            events_query = (
                select(Event)
                .where(Event.attempt_id.in_(attempt_ids))
                .order_by(Event.timestamp)
            )
            events_result = await db.execute(events_query)
            events = list(events_result.scalars().all())

            attempt_user_task: dict[int, tuple[int, str]] = {}
            for a in attempts:
                attempt_user_task[a.id] = (a.user_id, a.task_id)

            user_task_events: dict[tuple[int, str], list[Event]] = (
                defaultdict(list)
            )
            for e in events:
                if e.attempt_id is None:
                    continue
                key = attempt_user_task.get(e.attempt_id)
                if key:
                    user_task_events[key].append(e)

            task_solve_times: dict[str, list[int]] = defaultdict(list)
            for (_uid, tid), evts in user_task_events.items():
                first_ts = min(e.timestamp for e in evts)
                correct_submit_ts: int | None = None
                for e in evts:
                    action = e.trigger.get("action", "")
                    details = e.trigger.get("details", {})
                    if action == "submit" and details.get("correct") is True:
                        ts = e.timestamp
                        if correct_submit_ts is None or ts < correct_submit_ts:
                            correct_submit_ts = ts

                if correct_submit_ts is not None:
                    task_solve_times[tid].append(
                        max(0, correct_submit_ts - first_ts)
                    )

            tasks_data: list[TaskSolveStats] = []
            for tid in task_ids:
                times = task_solve_times.get(tid)
                if not times:
                    continue
                times.sort()
                n = len(times)
                avg = sum(times) / n
                min_t = times[0]
                max_t = times[-1]
                p95_idx = max(0, min(n - 1, int(0.95 * n)))
                p95 = times[p95_idx]

                tasks_data.append(
                    TaskSolveStats(
                        task_id=tid,
                        avg_time_ms=avg,
                        min_time_ms=min_t,
                        max_time_ms=max_t,
                        p95_time_ms=p95,
                        completed_count=n,
                    )
                )

            tasks_data.sort(key=lambda t: t.avg_time_ms, reverse=True)

            if tasks_data:
                batches_data.append(
                    BatchSolveBreakdown(
                        batch_id=batch.id,
                        batch_name=batch.name,
                        tasks=tasks_data,
                    )
                )

        return ActivityBatchBreakdown(batches=batches_data)
