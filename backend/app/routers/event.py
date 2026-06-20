from fastapi import APIRouter, Depends, Query, status

from app.dependencies.database import DatabaseSession
from app.repositories.event import EventRepository
from app.schemas.event import EventCreate, EventRead
from app.services.event import EventService

router = APIRouter(prefix="/api/v1/events", tags=["events"])


async def get_service(db_session: DatabaseSession) -> EventService:
    repository = EventRepository(db_session=db_session)
    return EventService(repository=repository)


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: EventCreate,
    service: EventService = Depends(get_service),  # noqa: B008
) -> EventRead:
    return await service.create(data)


@router.get(
    "/users/{user_id}/tasks/{task_id}",
    response_model=list[EventRead],
)
async def get_by_user_and_task(
    user_id: int,
    task_id: str,
    attempt_id: int | None = Query(None, alias="attemptId"),
    service: EventService = Depends(get_service),  # noqa: B008
) -> list[EventRead]:
    return await service.get_events_by_user_and_task(
        user_id, task_id, attempt_id=attempt_id
    )
