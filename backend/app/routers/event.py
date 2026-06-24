from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import CurrentUserDep, require_owner_or_admin
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.review import PeerReviewPairRepository
from app.schemas.event import EventCreate, EventCrossRead, EventRead
from app.services.event import EventService

router = APIRouter(prefix="/api/v1/events", tags=["events"])


async def get_service(db_session: DatabaseSession) -> EventService:
    repository = EventRepository(db_session=db_session)
    return EventService(repository=repository)


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: EventCreate,
    service: EventService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> EventRead:
    require_owner_or_admin(data.user_id, current_user)
    has_access = await batch_repo.user_has_access(data.user_id, data.task_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {data.user_id} does not have access to task {data.task_id}",
        )
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
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[EventRead]:
    require_owner_or_admin(user_id, current_user)
    return await service.get_events_by_user_and_task(
        user_id, task_id, attempt_id=attempt_id
    )


@router.get(
    "/cross/{target_user_id}/tasks/{task_id}",
    response_model=list[EventCrossRead],
)
async def get_cross_events(
    target_user_id: int,
    task_id: str,
    attempt_id: int | None = Query(None, alias="attemptId"),
    service: EventService = Depends(get_service),  # noqa: B008
    db_session: DatabaseSession = None,  # type: ignore[assignment]
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[EventCrossRead]:
    pair_repo = PeerReviewPairRepository(db_session=db_session)
    paired_ids = await pair_repo.get_paired_solver_ids(current_user.user_id)
    if target_user_id not in paired_ids and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not paired with this user",
        )
    events = await service.get_events_by_user_and_task(
        target_user_id, task_id, attempt_id=attempt_id
    )
    return [
        EventCrossRead.model_validate(ev.model_dump(exclude={"user_id"}))
        for ev in events
    ]
