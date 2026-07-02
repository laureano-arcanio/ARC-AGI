from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.batch import Batch, BatchAssignment
from app.models.event import Event
from app.models.user import User
from app.schemas.batch import BatchLeaderboardEntry


def _compute_attempt_status(trigger: dict[str, Any]) -> str | None:
    action = trigger.get("action", "")
    details = trigger.get("details", {})
    if action == "submit":
        return "completed" if details.get("correct") else "failed"
    if action == "abandon":
        return "abandoned"
    if action == "give_up":
        return "abandoned"
    return None


class LeaderboardService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def get_batch_leaderboard(
        self, batch_id: int
    ) -> list[BatchLeaderboardEntry]:
        batch_query = select(Batch).where(Batch.id == batch_id)
        batch_result = await self.db_session.execute(batch_query)
        batch = batch_result.scalar_one_or_none()
        if batch is None:
            return []

        task_ids = list(batch.task_ids)
        if not task_ids:
            return []

        user_query = (
            select(User.id, User.email)
            .join(BatchAssignment, BatchAssignment.user_id == User.id)
            .where(BatchAssignment.batch_id == batch_id)
        )
        user_result = await self.db_session.execute(user_query)
        users = {row[0]: row[1] for row in user_result.all()}

        if not users:
            return []

        user_ids = list(users.keys())
        total_tasks = len(task_ids)

        attempts_query = select(Attempt).where(
            Attempt.user_id.in_(user_ids),
            Attempt.task_id.in_(task_ids),
        )
        attempts_result = await self.db_session.execute(attempts_query)
        attempts = list(attempts_result.scalars().all())

        if not attempts:
            return []

        attempt_ids = [a.id for a in attempts]
        events_query = (
            select(Event)
            .where(Event.attempt_id.in_(attempt_ids))
            .order_by(Event.timestamp)
        )
        events_result = await self.db_session.execute(events_query)
        events = list(events_result.scalars().all())

        events_by_attempt: dict[int, list[Event]] = defaultdict(list)
        for e in events:
            if e.attempt_id is None:
                continue
            events_by_attempt[e.attempt_id].append(e)

        attempt_task: dict[int, tuple[int, str]] = {}
        attempt_status: dict[int, str | None] = {}
        for a in attempts:
            attempt_task[a.id] = (a.user_id, a.task_id)
            attempt_evts = events_by_attempt.get(a.id, [])
            if attempt_evts:
                attempt_status[a.id] = _compute_attempt_status(
                    attempt_evts[-1].trigger
                )
            else:
                attempt_status[a.id] = None

        user_completed: dict[int, set[str]] = defaultdict(set)
        user_abandoned: dict[int, set[str]] = defaultdict(set)
        user_incomplete: dict[int, set[str]] = defaultdict(set)
        user_total_time: dict[int, int] = defaultdict(int)
        user_total_actions: dict[int, int] = defaultdict(int)

        for aid, status in attempt_status.items():
            uid, tid = attempt_task[aid]
            evts = events_by_attempt.get(aid, [])
            if evts:
                first_ts = evts[0].timestamp
                last_ts = evts[-1].timestamp
                user_total_time[uid] += max(0, last_ts - first_ts)
                user_total_actions[uid] += len(evts)

            if status == "completed":
                user_completed[uid].add(tid)
            elif status == "abandoned":
                if tid not in user_completed[uid]:
                    user_abandoned[uid].add(tid)
            else:
                if (
                    tid not in user_completed[uid]
                    and tid not in user_abandoned[uid]
                ):
                    user_incomplete[uid].add(tid)

        result: list[BatchLeaderboardEntry] = []
        for uid, email in users.items():
            completed = len(user_completed.get(uid, set()))
            abandoned = len(user_abandoned.get(uid, set()))
            incomplete = len(user_incomplete.get(uid, set()))
            not_started = total_tasks - completed - abandoned - incomplete
            total_time = user_total_time.get(uid, 0)
            total_actions = user_total_actions.get(uid, 0)

            result.append(
                BatchLeaderboardEntry(
                    email=email,
                    user_id=uid,
                    total_time_ms=total_time,
                    avg_time_ms=total_time / total_tasks,
                    total_actions=total_actions,
                    avg_actions=total_actions / total_tasks,
                    completed_tasks=completed,
                    abandoned_tasks=abandoned,
                    incomplete_tasks=incomplete,
                    not_started_tasks=not_started,
                    total_tasks=total_tasks,
                )
            )

        result.sort(key=lambda e: (-e.completed_tasks, e.avg_time_ms))
        return result
