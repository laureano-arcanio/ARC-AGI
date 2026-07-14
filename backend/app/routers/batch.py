from fastapi import APIRouter, Depends, status

from app.dependencies.auth import AdminDep, CurrentUserDep, require_owner_or_admin
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchAssignmentRepository, BatchRepository
from app.schemas.batch import BatchCreate, BatchLeaderboardEntry, BatchRead, BatchUpdate
from app.schemas.batch_assignment import BatchAssignmentCreate, BatchAssignmentRead
from app.services.batch import BatchAssignmentService, BatchService
from app.services.leaderboard import LeaderboardService

router = APIRouter(prefix="/api/v1/batches", tags=["batches"])


async def get_batch_service(db_session: DatabaseSession) -> BatchService:
    repository = BatchRepository(db_session=db_session)
    return BatchService(repository=repository)


async def get_assignment_service(
    db_session: DatabaseSession,
) -> BatchAssignmentService:
    repository = BatchAssignmentRepository(db_session=db_session)
    return BatchAssignmentService(repository=repository)


@router.post("/", response_model=BatchRead, status_code=status.HTTP_201_CREATED)
async def create_batch(
    data: BatchCreate,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> BatchRead:
    return await service.create(data)


@router.get("/", response_model=list[BatchRead])
async def list_batches(
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[BatchRead]:
    return await service.get_all()


@router.get("/{id}", response_model=BatchRead)
async def get_batch(
    id: int,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> BatchRead:
    return await service.get_by_id(id)


@router.put("/{id}", response_model=BatchRead)
async def update_batch(
    id: int,
    data: BatchUpdate,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> BatchRead:
    return await service.update(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    id: int,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(id)


@router.get("/user/{user_id}", response_model=list[BatchRead])
async def get_user_batches(
    user_id: int,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[BatchRead]:
    require_owner_or_admin(user_id, current_user)
    return await service.get_batches_for_user(user_id)


@router.get("/user/{user_id}/task-ids", response_model=list[str])
async def get_user_accessible_task_ids(
    user_id: int,
    service: BatchService = Depends(get_batch_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[str]:
    require_owner_or_admin(user_id, current_user)
    return await service.get_accessible_task_ids(user_id)


@router.post(
    "/{batch_id}/assign/{user_id}",
    response_model=BatchAssignmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def assign_batch_to_user(
    batch_id: int,
    user_id: int,
    service: BatchAssignmentService = Depends(get_assignment_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> BatchAssignmentRead:
    return await service.create(
        BatchAssignmentCreate(batch_id=batch_id, user_id=user_id)
    )


@router.delete(
    "/{batch_id}/unassign/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unassign_batch_from_user(
    batch_id: int,
    user_id: int,
    service: BatchAssignmentService = Depends(get_assignment_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.unassign(batch_id, user_id)


@router.get(
    "/{id}/leaderboard",
    response_model=list[BatchLeaderboardEntry],
)
async def get_batch_leaderboard(
    id: int,
    db_session: DatabaseSession = None,  # type: ignore[assignment]
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[BatchLeaderboardEntry]:
    service = LeaderboardService(db_session=db_session)
    return await service.get_batch_leaderboard(id)
