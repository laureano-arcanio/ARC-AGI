import json
import time
from collections import defaultdict
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.batch import Batch, BatchAssignment
from app.models.event import Event
from app.models.task_tag import TaskTag, TaskTagRelation
from app.models.user import User
from app.models.user_review import UserReview
from app.repositories.event import EventRepository
from app.schemas.activity import (
    ActivityBatchBreakdown,
    ActivityStats,
    ActivitySummary,
    BatchSolveBreakdown,
    EventTypeSummary,
    TaskSolveStats,
    TimelineBucket,
    UserOverlapBucket,
    UserReviewStats,
)
from app.services.arc_task import ArcTaskService
from app.services.synthetic_task import SyntheticTaskService


def _review_duration_seconds(
    started_at: datetime | None,
    finished_at: datetime | None,
    updated_at: datetime | None,
) -> int | None:
    """Seconds from started_at to the end of a review session.

    End is finished_at when the review reached a terminal status, otherwise
    the last update as a best-effort close."""
    if started_at is None:
        return None
    end = finished_at or updated_at
    if end is None:
        return None
    duration = (end - started_at).total_seconds()
    return max(0, int(duration))


class ActivityService:
    def __init__(self, event_repo: EventRepository) -> None:
        self.repo = event_repo

    async def get_user_review_stats(self) -> list[UserReviewStats]:
        """Per-solver aggregates of time spent reviewing synthetic tasks."""
        db: AsyncSession = self.repo.db_session

        rows = await db.execute(
            select(
                UserReview.user_id,
                User.email,
                UserReview.started_at,
                UserReview.finished_at,
                UserReview.updated_at,
            )
            .join(User, User.id == UserReview.user_id)
            .where(UserReview.started_at.isnot(None))
        )

        durations_by_user: dict[int, list[int]] = {}
        emails: dict[int, str] = {}
        for user_id, email, started_at, finished_at, updated_at in rows.all():
            duration = _review_duration_seconds(
                started_at, finished_at, updated_at
            )
            if duration is None:
                continue
            emails[user_id] = email or ""
            durations_by_user.setdefault(user_id, []).append(duration)

        stats: list[UserReviewStats] = []
        for user_id in sorted(durations_by_user):
            durations = durations_by_user[user_id]
            total = sum(durations)
            count = len(durations)
            stats.append(
                UserReviewStats(
                    user_id=user_id,
                    email=emails.get(user_id, ""),
                    reviewed_count=count,
                    total_seconds=total,
                    avg_seconds=round(total / count, 1) if count else 0.0,
                    min_seconds=min(durations),
                    max_seconds=max(durations),
                )
            )
        return stats

    async def get_stats(
        self,
        event_types: list[str] | None = None,
        hours: int = 24,
    ) -> ActivityStats:
        now_ms = int(time.time() * 1000)
        since_n = now_ms - hours * 3600 * 1000
        since_24h = now_ms - 24 * 3600 * 1000

        rows = await self.repo.get_timeline(event_types, since_n)
        timeline = [
            TimelineBucket(bucket=r.bucket.isoformat(), count=r.count)
            for r in rows
        ]

        last_ts = await self.repo.get_last_event_timestamp()

        active = await self.repo.get_active_users_count(since_24h)

        active_emails = await self.repo.get_active_user_emails(since_24h)

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
            active_user_emails=active_emails,
            event_type_summary=summary,
            total_events=total,
        )

    async def get_summary(self) -> ActivitySummary:
        db: AsyncSession = self.repo.db_session

        total_result = await db.execute(
            text("""
                SELECT COUNT(DISTINCT task_id) AS total
                FROM event
                WHERE trigger->>'action' = 'submit'
                  AND trigger->'details'->>'correct' = 'true'
            """)
        )
        total = total_result.scalar_one_or_none() or 0

        overlap_result = await db.execute(
            text("""
                SELECT user_count, COUNT(*) AS task_count
                FROM (
                    SELECT task_id, COUNT(DISTINCT user_id) AS user_count
                    FROM event
                    WHERE trigger->>'action' = 'submit'
                      AND trigger->'details'->>'correct' = 'true'
                    GROUP BY task_id
                ) sub
                GROUP BY user_count
                ORDER BY user_count
            """)
        )
        overlap = [
            UserOverlapBucket(overlap_count=row[0], task_count=row[1])
            for row in overlap_result.all()
        ]

        batch_rows = await db.execute(
            select(Batch.task_ids).where(Batch.batch_type == "review")
        )
        review_entries: set[str] = set()
        for (task_ids,) in batch_rows.all():
            for tid in task_ids or []:
                review_entries.add(str(tid))

        total_to_review = len(review_entries)

        total_done = 0
        failed_reviews = 0
        if review_entries:
            entry_variants = SyntheticTaskService().resolve_entry_ids(
                sorted(review_entries)
            )
            all_variant_ids = [
                vid for vids in entry_variants.values() for vid in vids
            ]
            done_variant_ids: set[str] = set()
            if all_variant_ids:
                review_rows = await db.execute(
                    select(UserReview.synth_task_id).where(
                        UserReview.status == "done",
                        UserReview.synth_task_id.in_(all_variant_ids),
                    )
                )
                done_variant_ids = {row[0] for row in review_rows.all()}

                failed_rows = await db.execute(
                    select(UserReview.synth_task_id).where(
                        UserReview.correct.is_(False),
                        UserReview.synth_task_id.in_(all_variant_ids),
                    )
                )
                failed_reviews = len(
                    {row[0] for row in failed_rows.all()}
                )

            total_done = sum(
                1
                for vids in entry_variants.values()
                if vids and all(vid in done_variant_ids for vid in vids)
            )

        return ActivitySummary(
            total_unique_tasks_resolved=total,
            user_overlap=overlap,
            total_to_review=total_to_review,
            pending_user_reviews=total_to_review - total_done,
            total_done=total_done,
            failed_reviews=failed_reviews,
        )

    async def get_batch_breakdown(self) -> ActivityBatchBreakdown:
        db: AsyncSession = self.repo.db_session

        batches_query = select(Batch).order_by(Batch.id)
        batches_result = await db.execute(batches_query)
        batches = list(batches_result.scalars().all())

        all_task_ids: set[str] = set()
        solved_task_ids: set[str] = set()
        batches_data: list[BatchSolveBreakdown] = []
        for batch in batches:
            task_ids = list(batch.task_ids)
            all_task_ids.update(task_ids)
            if not task_ids:
                continue

            tasks_data: list[TaskSolveStats] = []

            user_query = (
                select(User.id, User.email)
                .join(BatchAssignment, BatchAssignment.user_id == User.id)
                .where(BatchAssignment.batch_id == batch.id)
            )
            user_result = await db.execute(user_query)
            users = {row[0]: row[1] for row in user_result.all()}

            if users:
                user_ids = list(users.keys())

                attempts_query = select(Attempt).where(
                    Attempt.user_id.in_(user_ids),
                    Attempt.task_id.in_(task_ids),
                )
                attempts_result = await db.execute(attempts_query)
                attempts = list(attempts_result.scalars().all())

                if attempts:
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

                    for tid in task_ids:
                        times = task_solve_times.get(tid)
                        if not times:
                            continue
                        solved_task_ids.add(tid)
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

            batches_data.append(
                BatchSolveBreakdown(
                    batch_id=batch.id,
                    batch_name=batch.name,
                    total_tasks=len(task_ids),
                    tasks=tasks_data,
                )
            )

        return ActivityBatchBreakdown(
            batches=batches_data,
            total_unique_tasks=len(all_task_ids),
            total_solved_tasks=len(solved_task_ids),
        )

    async def get_export_dataset(
        self,
        arc_task_service: ArcTaskService,
    ) -> AsyncGenerator[str, None]:
        db: AsyncSession = self.repo.db_session

        excluded = await db.execute(
            select(User.id).where(
                User.email.in_(["admin@arc.com", "solver@arc.com"])
            )
        )
        excluded_ids = {row[0] for row in excluded.all()}

        task_rows = await db.execute(
            select(Event.task_id).distinct().order_by(Event.task_id)
        )
        task_ids = [row[0] for row in task_rows.all()]

        for task_id in task_ids:
            task = await arc_task_service.get_by_id(task_id)
            if task is None:
                continue

            task_data: dict[str, Any] = {
                "task_id": task_id,
                "train": [
                    {"input": p.input, "output": p.output}
                    for p in task.train
                ],
                "test": [
                    {"input": p.input, "output": p.output}
                    for p in task.test
                ],
            }

            user_rows = await db.execute(
                select(Event.user_id, User.email)
                .join(User, User.id == Event.user_id)
                .where(
                    Event.task_id == task_id,
                    Event.user_id.notin_(excluded_ids),
                )
                .distinct()
            )
            task_users = {row[0]: row[1] for row in user_rows.all()}

            if not task_users:
                continue

            users_data: list[dict[str, Any]] = []
            for user_id, email in task_users.items():
                attempts = await db.execute(
                    select(Attempt)
                    .where(
                        Attempt.user_id == user_id,
                        Attempt.task_id == task_id,
                    )
                    .order_by(Attempt.id)
                )
                attempt_objs = list(attempts.scalars().all())

                attempts_data: list[dict[str, Any]] = []
                for attempt in attempt_objs:
                    events = await db.execute(
                        select(Event)
                        .where(Event.attempt_id == attempt.id)
                        .order_by(Event.sequence_index, Event.timestamp)
                    )
                    event_objs = list(events.scalars().all())

                    events_data = [
                        {
                            "id": e.id,
                            "node_id": e.node_id,
                            "parent_node_id": e.parent_node_id,
                            "test_pair_index": e.test_pair_index,
                            "trigger": e.trigger,
                            "state_snapshot": e.state_snapshot,
                            "timestamp": e.timestamp,
                            "sequence_index": e.sequence_index,
                        }
                        for e in event_objs
                    ]

                    attempts_data.append(
                        {
                            "attempt_id": attempt.id,
                            "created_at": (
                                attempt.created_at.isoformat()
                                if attempt.created_at
                                else None
                            ),
                            "updated_at": (
                                attempt.updated_at.isoformat()
                                if attempt.updated_at
                                else None
                            ),
                            "events": events_data,
                        }
                    )

                users_data.append(
                    {
                        "user_id": user_id,
                        "email": email,
                        "attempts": attempts_data,
                    }
                )

            task_data["users"] = users_data

            task_tags_result = await db.execute(
                select(TaskTag).where(TaskTag.task_id == task_id)
            )
            task_tag_objs: list[TaskTag] = list(task_tags_result.scalars().all())
            task_data["tags"] = [
                {
                    "id": t.id,
                    "user_id": t.user_id,
                    "scope_type": t.scope_type,
                    "pair_type": t.pair_type,
                    "pair_index": t.pair_index,
                    "grid_type": t.grid_type,
                    "selected_cells": t.selected_cells,
                    "mask": t.mask,
                    "labels": t.labels,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                }
                for t in task_tag_objs
            ]

            tag_relations_result = await db.execute(
                select(TaskTagRelation).where(TaskTagRelation.task_id == task_id)
            )
            relation_objs: list[TaskTagRelation] = list(
                tag_relations_result.scalars().all()
            )
            task_data["tag_relations"] = [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "from_tag_id": r.from_tag_id,
                    "to_tag_id": r.to_tag_id,
                    "labels": r.labels,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                }
                for r in relation_objs
            ]

            yield json.dumps(task_data, ensure_ascii=False) + "\n"
