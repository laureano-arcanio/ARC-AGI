from typing import Any

from app.models.attempt import Attempt
from app.repositories.attempt import AttemptRepository
from app.repositories.event import EventRepository
from app.schemas.attempt import (
    AttemptCreate,
    AttemptRead,
    AttemptUpdate,
    UserTaskSummary,
)
from app.services.base_service import BaseService


def _compute_status(trigger: dict[str, Any]) -> str | None:
    action = trigger.get("action")
    if action == "submit":
        if trigger.get("details", {}).get("correct") is True:
            return "completed"
        if trigger.get("details", {}).get("correct") is False:
            return "failed"
    if action == "abandon":
        return "abandoned"
    return None


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
        attempt_ids = [inst.id for inst in instances if inst.id is not None]
        event_repo = EventRepository(db_session=self.repository.db_session)
        if attempt_ids:
            all_events = await event_repo.get_by_user_and_task(
                user_id, task_id
            )
            status_score: dict[str, int] = {
                "completed": 3, "failed": 2, "abandoned": 1,
            }
            status_map: dict[int, str] = {}
            for ev in all_events:
                aid = ev.attempt_id
                if aid is None:
                    continue
                trigger = ev.trigger
                s = _compute_status(trigger)
                if s is None:
                    continue
                current = status_map.get(aid)
                new_score = status_score.get(s, 0)
                if current is None or new_score > status_score.get(current, 0):
                    status_map[aid] = s
        else:
            status_map = {}

        result = []
        for inst in instances:
            dto = self.read_schema.model_validate(inst)
            if inst.id is not None and inst.id in status_map:
                dto.status = status_map[inst.id]
            result.append(dto)
        return result

    async def get_user_tasks(
        self, user_id: int
    ) -> list[UserTaskSummary]:
        rows = await self.repository.get_user_tasks(user_id)
        return [UserTaskSummary.model_validate(row) for row in rows]
