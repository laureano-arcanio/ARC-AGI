from sqlalchemy import inspect as sa_inspect

from app.models.batch import Batch, BatchAssignment
from app.repositories.batch import BatchAssignmentRepository, BatchRepository
from app.schemas.batch import BatchCreate, BatchRead, BatchUpdate
from app.schemas.batch_assignment import BatchAssignmentCreate, BatchAssignmentRead
from app.services.base_service import BaseService


class BatchService(
    BaseService[Batch, BatchCreate, BatchUpdate, BatchRead]
):
    repository: BatchRepository
    read_schema = BatchRead

    @staticmethod
    def _get_assigned_user_ids(instance: Batch) -> list[int]:
        insp = sa_inspect(instance)
        if "assignments" not in insp.unloaded:
            return [a.user_id for a in instance.assignments]
        return []

    def _to_read(self, instance: Batch) -> BatchRead:
        data = {
            "id": instance.id,
            "name": instance.name,
            "task_ids": instance.task_ids,
            "created_at": instance.created_at,
            "updated_at": instance.updated_at,
            "assigned_user_ids": self._get_assigned_user_ids(instance),
        }
        return BatchRead.model_validate(data)

    async def get_all(self) -> list[BatchRead]:
        instances = await self.repository.get_all()
        return [self._to_read(inst) for inst in instances]

    async def get_by_id(self, id: int) -> BatchRead:
        instance = await self.repository.get_by_id(id)
        return self._to_read(instance)

    async def create(self, data: BatchCreate) -> BatchRead:
        instance = await self.repository.create(data.model_dump())
        return self._to_read(instance)

    async def update(self, id: int, data: BatchUpdate) -> BatchRead:
        instance = await self.repository.update(
            id, data.model_dump(exclude_unset=True)
        )
        return self._to_read(instance)

    async def get_batches_for_user(self, user_id: int) -> list[BatchRead]:
        instances = await self.repository.get_batches_for_user(user_id)
        return [self._to_read(inst) for inst in instances]

    async def get_accessible_task_ids(self, user_id: int) -> list[str]:
        return await self.repository.get_accessible_task_ids(user_id)

    async def user_has_access(self, user_id: int, task_id: str) -> bool:
        return await self.repository.user_has_access(user_id, task_id)


class BatchAssignmentService(
    BaseService[
        BatchAssignment,
        BatchAssignmentCreate,
        BatchAssignmentCreate,
        BatchAssignmentRead,
    ]
):
    repository: BatchAssignmentRepository
    read_schema = BatchAssignmentRead

    async def unassign(
        self, batch_id: int, user_id: int
    ) -> None:
        await self.repository.delete_by_batch_and_user(batch_id, user_id)
