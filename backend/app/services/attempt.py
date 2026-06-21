from app.models.attempt import Attempt
from app.repositories.attempt import AttemptRepository
from app.schemas.attempt import (
    AttemptCreate,
    AttemptRead,
    AttemptUpdate,
    UserTaskSummary,
)
from app.services.base_service import BaseService


class AttemptService(
    BaseService[Attempt, AttemptCreate, AttemptUpdate, AttemptRead]
):
    repository: AttemptRepository
    read_schema = AttemptRead

    async def get_by_user_and_task(
        self, user_id: int, task_id: str
    ) -> list[AttemptRead]:
        instances = await self.repository.get_by_user_and_task(
            user_id, task_id
        )
        return [self.read_schema.model_validate(inst) for inst in instances]

    async def get_user_tasks(
        self, user_id: int
    ) -> list[UserTaskSummary]:
        rows = await self.repository.get_user_tasks(user_id)
        return [UserTaskSummary.model_validate(row) for row in rows]
