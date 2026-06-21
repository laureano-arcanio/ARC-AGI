from typing import Any

from sqlalchemy import func, select

from app.models.attempt import Attempt
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
        query = (
            select(
                self.model.task_id,
                func.count(self.model.id).label("attempt_count"),
            )
            .where(self.model.user_id == user_id)
            .group_by(self.model.task_id)
            .order_by(self.model.task_id)
        )
        result = await self.db_session.execute(query)
        return [
            {"task_id": row[0], "attempt_count": row[1]}
            for row in result.all()
        ]
