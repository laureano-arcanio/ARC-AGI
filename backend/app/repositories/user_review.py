from typing import Any

from sqlalchemy import select

from app.errors import ObjectNotFoundError
from app.models.user_review import UserReview
from app.repositories.base_repository import BaseRepository


class UserReviewRepository(BaseRepository[UserReview]):
    model = UserReview

    async def get_by_user_and_task(
        self, user_id: int, synth_task_id: str
    ) -> UserReview:
        query = select(UserReview).where(
            UserReview.user_id == user_id,
            UserReview.synth_task_id == synth_task_id,
        )
        result = await self.db_session.execute(query)
        instance = result.scalar_one_or_none()
        if not instance:
            raise ObjectNotFoundError(
                object_type="UserReview",
                object_id=f"user={user_id},task={synth_task_id}",
            )
        return instance

    async def get_by_user_and_tasks(
        self, user_id: int, synth_task_ids: list[str]
    ) -> list[UserReview]:
        if not synth_task_ids:
            return []
        query = select(UserReview).where(
            UserReview.user_id == user_id,
            UserReview.synth_task_id.in_(synth_task_ids),
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def upsert(
        self, user_id: int, synth_task_id: str, data: dict[str, Any]
    ) -> UserReview:
        instance = None
        try:
            instance = await self.get_by_user_and_task(user_id, synth_task_id)
        except ObjectNotFoundError:
            instance = None
        if instance is None:
            instance = UserReview(
                user_id=user_id, synth_task_id=synth_task_id, notes=[]
            )
            self.db_session.add(instance)
        for key, value in data.items():
            setattr(instance, key, value)
        await self.db_session.flush()
        await self.db_session.refresh(instance)
        return instance
