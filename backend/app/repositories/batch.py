from typing import Any

from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import selectinload

from app.errors import ObjectNotFoundError
from app.models.batch import Batch, BatchAssignment
from app.repositories.base_repository import BaseRepository


class BatchRepository(BaseRepository[Batch]):
    model = Batch

    detail_options = [selectinload(Batch.assignments)]
    list_options = [selectinload(Batch.assignments)]

    async def create(self, data: dict[str, Any]) -> Batch:
        db_instance = self.model(**data)
        self.db_session.add(db_instance)
        await self.db_session.flush()
        return await self._get_db_instance_by_id(
            db_instance.id, options=self.detail_options
        )

    async def update(self, id: int, data: dict[str, Any]) -> Batch:
        db_instance = await self._get_db_instance_by_id(
            id, options=self.detail_options
        )
        for key, value in data.items():
            setattr(db_instance, key, value)
        self.db_session.add(db_instance)
        await self.db_session.flush()
        await self.db_session.refresh(db_instance)
        return db_instance

    async def get_batches_for_user(self, user_id: int) -> list[Batch]:
        query = (
            select(Batch)
            .join(BatchAssignment, BatchAssignment.batch_id == Batch.id)
            .where(BatchAssignment.user_id == user_id)
            .options(selectinload(Batch.assignments))
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().unique().all())

    async def get_accessible_task_ids(self, user_id: int) -> list[str]:
        batches = await self.get_batches_for_user(user_id)
        seen: set[str] = set()
        for batch in batches:
            for tid in batch.task_ids:
                seen.add(str(tid))
        return sorted(seen)

    async def user_has_access(self, user_id: int, task_id: str) -> bool:
        query = (
            select(BatchAssignment)
            .join(Batch, Batch.id == BatchAssignment.batch_id)
            .where(
                BatchAssignment.user_id == user_id,
                cast(Batch.task_ids, JSONB).contains([task_id]),
            )
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none() is not None


class BatchAssignmentRepository(BaseRepository[BatchAssignment]):
    model = BatchAssignment

    async def get_by_batch_and_user(
        self, batch_id: int, user_id: int
    ) -> BatchAssignment:
        query = select(BatchAssignment).where(
            BatchAssignment.batch_id == batch_id,
            BatchAssignment.user_id == user_id,
        )
        result = await self.db_session.execute(query)
        instance = result.scalar_one_or_none()
        if not instance:
            raise ObjectNotFoundError(
                object_type="BatchAssignment",
                object_id=f"batch={batch_id},user={user_id}",
            )
        return instance

    async def get_assignments_for_user(
        self, user_id: int
    ) -> list[BatchAssignment]:
        query = select(BatchAssignment).where(
            BatchAssignment.user_id == user_id
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def delete_by_batch_and_user(
        self, batch_id: int, user_id: int
    ) -> None:
        instance = await self.get_by_batch_and_user(batch_id, user_id)
        await self.db_session.delete(instance)
        await self.db_session.flush()
