from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.arc_task import ArcTaskRead
from app.services.arc_task import ArcTaskService

router = APIRouter(prefix="/api/v1/arc-tasks", tags=["arc-tasks"])


def get_service() -> ArcTaskService:
    return ArcTaskService()


@router.get("/random", response_model=list[ArcTaskRead])
async def get_random_tasks(
    count: int = Query(10, ge=1, le=100),
    service: ArcTaskService = Depends(get_service),  # noqa: B008
) -> list[ArcTaskRead]:
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
