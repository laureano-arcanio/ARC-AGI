from app.models.task_tag import TaskTag, TaskTagRelation
from app.repositories.task_tag import (
    TaskTagRelationRepository,
    TaskTagRepository,
)
from app.schemas.task_tag import (
    TaskTagCreate,
    TaskTagRead,
    TaskTagRelationCreate,
    TaskTagRelationRead,
    TaskTagUpdate,
)
from app.services.base_service import BaseService


class TaskTagService(
    BaseService[TaskTag, TaskTagCreate, TaskTagUpdate, TaskTagRead]
):
    repository: TaskTagRepository
    read_schema = TaskTagRead

    async def get_by_task_id(self, task_id: str) -> list[TaskTagRead]:
        instances = await self.repository.get_by_task_id(task_id)
        return [self.read_schema.model_validate(inst) for inst in instances]

    async def create_tag(
        self, data: TaskTagCreate, user_id: int
    ) -> TaskTagRead:
        payload = data.model_dump()
        payload["user_id"] = user_id
        instance = await self.repository.create(payload)
        return self.read_schema.model_validate(instance)


class TaskTagRelationService(
    BaseService[
        TaskTagRelation,
        TaskTagRelationCreate,
        TaskTagRelationCreate,
        TaskTagRelationRead,
    ]
):
    repository: TaskTagRelationRepository
    read_schema = TaskTagRelationRead

    async def get_by_task_id(
        self, task_id: str
    ) -> list[TaskTagRelationRead]:
        instances = await self.repository.get_by_task_id(task_id)
        return [self.read_schema.model_validate(inst) for inst in instances]

    async def create_relation(
        self, data: TaskTagRelationCreate, user_id: int
    ) -> TaskTagRelationRead:
        payload = data.model_dump()
        payload["user_id"] = user_id
        instance = await self.repository.create(payload)
        return self.read_schema.model_validate(instance)
