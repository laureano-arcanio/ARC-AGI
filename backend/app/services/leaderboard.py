from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.batch import Batch, BatchAssignment
from app.models.event import Event
from app.models.user import User
from app.schemas.batch import BatchLeaderboardEntry


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
        for a in attempts:
            attempt_task[a.id] = (a.user_id, a.task_id)

        user_completed: dict[int, set[str]] = defaultdict(set)
        user_abandoned: dict[int, set[str]] = defaultdict(set)
        user_incomplete: dict[int, set[str]] = defaultdict(set)
        user_total_time: dict[int, int] = defaultdict(int)
        user_total_actions: dict[int, int] = defaultdict(int)

        for aid, (uid, tid) in attempt_task.items():
            evts = events_by_attempt.get(aid, [])
            if not evts:
                continue

            first_ts = evts[0].timestamp
            last_ts = evts[-1].timestamp
            user_total_time[uid] += max(0, last_ts - first_ts)
            user_total_actions[uid] += len(evts)

            has_correct_submit = False
            has_abandon = False
            for e in evts:
                action = e.trigger.get("action", "")
                details = e.trigger.get("details", {})
                if action == "submit" and details.get("correct") is True:
                    has_correct_submit = True
                elif action in ("abandon", "give_up"):
                    has_abandon = True

            if has_correct_submit:
                user_completed[uid].add(tid)
            elif has_abandon:
                user_abandoned[uid].add(tid)
            else:
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
