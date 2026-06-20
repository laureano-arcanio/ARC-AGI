from fastapi import APIRouter, Depends, status

from app.dependencies.database import DatabaseSession
from app.repositories.attempt import AttemptRepository
from app.schemas.attempt import AttemptCreate, AttemptRead
from app.services.attempt import AttemptService

router = APIRouter(prefix="/api/v1/attempts", tags=["attempts"])


async def get_service(db_session: DatabaseSession) -> AttemptService:
    repository = AttemptRepository(db_session=db_session)
    return AttemptService(repository=repository)


@router.post("/", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: AttemptCreate,
    service: AttemptService = Depends(get_service),  # noqa: B008
) -> AttemptRead:
    return await service.create(data)


@router.get(
    "/users/{user_id}/tasks/{task_id}",
    response_model=list[AttemptRead],
)
async def get_by_user_and_task(
    user_id: int,
    task_id: str,
    service: AttemptService = Depends(get_service),  # noqa: B008
) -> list[AttemptRead]:
    return await service.get_by_user_and_task(user_id, task_id)
