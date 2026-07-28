from sqlalchemy import select

from app.models.task_tag import TaskTag, TaskTagRelation
from app.repositories.base_repository import BaseRepository


class TaskTagRepository(BaseRepository[TaskTag]):
    model = TaskTag

    async def get_by_task_id(self, task_id: str) -> list[TaskTag]:
        query = (
            select(TaskTag)
            .where(TaskTag.task_id == task_id)
            .order_by(TaskTag.created_at)
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())


class TaskTagRelationRepository(BaseRepository[TaskTagRelation]):
    model = TaskTagRelation

    async def get_by_task_id(
        self, task_id: str
    ) -> list[TaskTagRelation]:
        query = (
            select(TaskTagRelation)
            .where(TaskTagRelation.task_id == task_id)
            .order_by(TaskTagRelation.created_at)
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())
