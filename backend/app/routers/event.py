import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import CurrentUserDep, require_owner_or_admin
from app.dependencies.database import DatabaseSession
from app.repositories.attempt import AttemptRepository
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.review import PeerReviewPairRepository
from app.schemas.event import (
    EventCreate,
    EventCrossRead,
    EventRead,
    EventSubmitCreate,
)
from app.services.arc_task import ArcTaskService
from app.services.event import EventService
from app.services.event_validator import warn_fill_mismatch, warn_if_read_only_mutated

router = APIRouter(prefix="/api/v1/events", tags=["events"])


async def get_service(db_session: DatabaseSession) -> EventService:
    repository = EventRepository(db_session=db_session)
    return EventService(repository=repository)


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


async def get_attempt_repo(db_session: DatabaseSession) -> AttemptRepository:
    return AttemptRepository(db_session=db_session)


def get_arc_task_service() -> ArcTaskService:
    return ArcTaskService()


@router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: EventCreate,
    service: EventService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    attempt_repo: AttemptRepository = Depends(get_attempt_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> EventRead:
    require_owner_or_admin(data.user_id, current_user)
    has_access = await batch_repo.user_has_access(data.user_id, data.task_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {data.user_id} does not have access to task {data.task_id}",
        )
    # Server is authoritative for solve correctness: clients must not be able to
    # self-report a submit result. Submits go through the validated submit path.
    if data.trigger.get("action") == "submit":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit events must be recorded via /events/submit",
        )
    # An event may only be attached to an attempt the same user owns for the
    # same task; otherwise reasoning could be linked to the wrong attempt.
    if data.attempt_id is not None:
        attempt = await attempt_repo.get_by_id(data.attempt_id)
        if attempt.user_id != data.user_id or attempt.task_id != data.task_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Attempt does not belong to this user and task",
            )
        # Validate parentNodeId references an existing node in the same attempt,
        # unless this is the root (parent_node_id is null).
        if data.parent_node_id is not None:
            parent_exists = await service.repository.parent_node_exists(
                data.attempt_id,
                data.parent_node_id,
                data.test_pair_index,
            )
            if not parent_exists:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"parentNodeId '{data.parent_node_id}' "
                        f"not found in attempt {data.attempt_id}"
                    ),
                )
    result = await service.create(data)
    if data.attempt_id is not None:
        action = data.trigger.get("action", "")
        asyncio.create_task(
            warn_if_read_only_mutated(
                service.repository,
                data.attempt_id,
                data.node_id,
                data.parent_node_id,
                data.test_pair_index,
                action,
                data.state_snapshot,
            )
        )
        asyncio.create_task(
            warn_fill_mismatch(
                service.repository,
                data.attempt_id,
                data.node_id,
                data.parent_node_id,
                data.test_pair_index,
                action,
                data.trigger.get("details"),
                data.state_snapshot,
            )
        )
    return result


@router.post(
    "/submit", response_model=EventRead, status_code=status.HTTP_201_CREATED
)
async def submit(
    data: EventSubmitCreate,
    service: EventService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    attempt_repo: AttemptRepository = Depends(get_attempt_repo),  # noqa: B008
    arc_task_service: ArcTaskService = Depends(get_arc_task_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> EventRead:
    """Server-authoritative submit: correctness is computed here against the
    stored solutions, never trusted from the client."""
    require_owner_or_admin(data.user_id, current_user)
    has_access = await batch_repo.user_has_access(data.user_id, data.task_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {data.user_id} does not have access to task {data.task_id}",
        )
    attempt = await attempt_repo.get_by_id(data.attempt_id)
    if attempt.user_id != data.user_id or attempt.task_id != data.task_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attempt does not belong to this user and task",
        )
    correct = await arc_task_service.check_submission(data.task_id, data.grids)
    event = EventCreate(
        user_id=data.user_id,
        task_id=data.task_id,
        attempt_id=data.attempt_id,
        node_id=data.node_id,
        parent_node_id=data.parent_node_id,
        test_pair_index=data.test_pair_index,
        trigger={
            "kind": "mechanical",
            "action": "submit",
            "details": {"correct": correct},
        },
        state_snapshot=data.state_snapshot,
        timestamp=data.timestamp or int(time.time() * 1000),
        sequence_index=data.sequence_index,
    )
    return await service.create(event)


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
