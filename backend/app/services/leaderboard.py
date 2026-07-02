from sqlalchemy import func, select
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

        per_task = (
            select(
                Attempt.user_id,
                Attempt.task_id,
                func.min(Event.timestamp).label("first_ts"),
                func.max(Event.timestamp).label("last_ts"),
                func.count(Event.id).label("action_count"),
            )
            .join(Event, Event.attempt_id == Attempt.id)
            .where(
                Attempt.user_id.in_(list(users.keys())),
                Attempt.task_id.in_(task_ids),
            )
            .group_by(Attempt.user_id, Attempt.task_id)
        )
        per_task_result = await self.db_session.execute(per_task)
        rows = per_task_result.all()

        user_stats: dict[int, dict[str, int]] = {}
        for row in rows:
            uid = row[0]
            if uid not in user_stats:
                user_stats[uid] = {"total_time_ms": 0, "total_actions": 0}
            first_ts = row[2] or 0
            last_ts = row[3] or 0
            time_ms = max(0, last_ts - first_ts)
            user_stats[uid]["total_time_ms"] += time_ms
            user_stats[uid]["total_actions"] += row[4] or 0

        total_tasks = len(task_ids)
        result: list[BatchLeaderboardEntry] = []
        for uid, email in users.items():
            stats = user_stats.get(uid, {"total_time_ms": 0, "total_actions": 0})
            result.append(
                BatchLeaderboardEntry(
                    email=email,
                    user_id=uid,
                    total_time_ms=stats["total_time_ms"],
                    avg_time_ms=stats["total_time_ms"] / total_tasks,
                    total_actions=stats["total_actions"],
                    avg_actions=stats["total_actions"] / total_tasks,
                )
            )

        result.sort(key=lambda e: e.avg_time_ms)
        return result
