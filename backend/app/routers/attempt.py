from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import AdminDep, CurrentUserDep, require_owner_or_admin
from app.dependencies.database import DatabaseSession
from app.repositories.attempt import AttemptRepository
from app.repositories.batch import BatchRepository
from app.schemas.attempt import AttemptCreate, AttemptRead
from app.services.attempt import AttemptService

router = APIRouter(prefix="/api/v1/attempts", tags=["attempts"])


async def get_service(db_session: DatabaseSession) -> AttemptService:
    repository = AttemptRepository(db_session=db_session)
    return AttemptService(repository=repository)


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


@router.post("/", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: AttemptCreate,
    service: AttemptService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> AttemptRead:
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
    response_model=list[AttemptRead],
)
async def get_by_user_and_task(
    user_id: int,
    task_id: str,
    service: AttemptService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[AttemptRead]:
    require_owner_or_admin(user_id, current_user)
    return await service.get_by_user_and_task(user_id, task_id)


@router.delete("/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    attempt_id: int,
    service: AttemptService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(attempt_id)
