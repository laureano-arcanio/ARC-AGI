from app.models.event import Event
from app.repositories.event import EventRepository
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.services.base_service import BaseService


class EventService(
    BaseService[Event, EventCreate, EventUpdate, EventRead]
):
    repository: EventRepository
    read_schema = EventRead

    async def get_events_by_user_and_task(
        self, user_id: int, task_id: str
    ) -> list[EventRead]:
        instances = await self.repository.get_by_user_and_task(
            user_id, task_id
        )
        return [self.read_schema.model_validate(inst) for inst in instances]
