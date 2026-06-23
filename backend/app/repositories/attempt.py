from typing import Any

from sqlalchemy import Boolean, cast, func, select
from sqlalchemy import delete as sa_delete

from app.errors import ObjectNotFoundError
from app.models.attempt import Attempt
from app.models.event import Event
from app.repositories.base_repository import BaseRepository


class AttemptRepository(BaseRepository[Attempt]):
    model = Attempt

    async def get_by_user_and_task(
        self, user_id: int, task_id: str
    ) -> list[Attempt]:
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.task_id == task_id,
        )
        query = query.order_by(self.model.created_at.desc())
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def get_user_tasks(
        self, user_id: int
    ) -> list[dict[str, Any]]:
        attempt_query = (
            select(
                self.model.task_id,
                func.count(self.model.id).label("attempt_count"),
            )
            .where(self.model.user_id == user_id)
            .group_by(self.model.task_id)
        )
        attempt_result = await self.db_session.execute(attempt_query)
        task_map: dict[str, dict[str, Any]] = {
            row[0]: {"task_id": row[0], "attempt_count": row[1]}
            for row in attempt_result.all()
        }

        solved_query = (
            select(Event.task_id)
            .where(
                Event.user_id == user_id,
                cast(
                    func.json_extract_path_text(
                        Event.trigger, 'details', 'correct'
                    ),
                    Boolean,
                ).is_(True),
            )
            .distinct()
        )
        solved_result = await self.db_session.execute(solved_query)
        solved_tasks = {row[0] for row in solved_result.all()}

        return [
            {**data, "solved": data["task_id"] in solved_tasks}
            for data in task_map.values()
        ]

    async def delete_by_user_and_task(
        self, user_id: int, task_id: str
    ) -> None:
        stmt_events = sa_delete(Event).where(
            Event.user_id == user_id,
            Event.task_id == task_id,
        )
        await self.db_session.execute(stmt_events)

        stmt_attempts = sa_delete(Attempt).where(
            Attempt.user_id == user_id,
            Attempt.task_id == task_id,
        )
        await self.db_session.execute(stmt_attempts)

    async def delete_by_id(self, attempt_id: int) -> None:
        stmt_events = sa_delete(Event).where(
            Event.attempt_id == attempt_id,
        )
        await self.db_session.execute(stmt_events)

        stmt_attempt = sa_delete(Attempt).where(
            Attempt.id == attempt_id,
        )
        result = await self.db_session.execute(stmt_attempt)
        if result.rowcount == 0:
            raise ObjectNotFoundError(
                object_type="Attempt", object_id=attempt_id
            )
