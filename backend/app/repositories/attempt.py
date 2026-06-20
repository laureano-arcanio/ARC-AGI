from sqlalchemy import select

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
