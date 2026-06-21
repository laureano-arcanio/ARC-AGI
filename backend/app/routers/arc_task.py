from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.schemas.arc_task import ArcTaskRead
from app.services.arc_task import ArcTaskService

router = APIRouter(prefix="/api/v1/arc-tasks", tags=["arc-tasks"])


def get_service() -> ArcTaskService:
    return ArcTaskService()


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


@router.get("/random", response_model=list[ArcTaskRead])
async def get_random_tasks(
    count: int = Query(10, ge=1, le=100),
    user_id: int | None = Query(None, alias="userId"),
    service: ArcTaskService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
) -> list[ArcTaskRead]:
    if user_id is not None:
        allowed_ids = await batch_repo.get_accessible_task_ids(user_id)
        if not allowed_ids:
            return []
        return await service.get_random_tasks_from_ids(
            count=count, allowed_ids=allowed_ids
        )
    return await service.get_random_tasks(count=count)


@router.get("/{task_id}", response_model=ArcTaskRead)
async def get_task(
    task_id: str,
    service: ArcTaskService = Depends(get_service),  # noqa: B008
) -> ArcTaskRead:
    task = await service.get_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task
