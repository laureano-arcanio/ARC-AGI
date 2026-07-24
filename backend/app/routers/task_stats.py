from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AdminDep
from app.dependencies.database import DatabaseSession
from app.schemas.task_stats import (
    TaskSearchPaginated,
    TaskSolverRead,
    TaskStatsPaginated,
)
from app.services.task_stats import TaskStatsService

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


async def get_service(db_session: DatabaseSession) -> TaskStatsService:
    return TaskStatsService(db_session=db_session)


@router.get("", response_model=TaskStatsPaginated)
async def get_tasks_stats(
    page: int = Query(1, alias="page", ge=1),
    per_page: int = Query(100, alias="perPage", ge=1, le=200),
    user_id: int | None = Query(None, alias="userId"),
    min_width: int | None = Query(None, alias="minWidth", ge=0),
    max_width: int | None = Query(None, alias="maxWidth", ge=0),
    min_height: int | None = Query(None, alias="minHeight", ge=0),
    max_height: int | None = Query(None, alias="maxHeight", ge=0),
    min_solutions: int | None = Query(None, alias="minSolutions", ge=0),
    max_solutions: int | None = Query(None, alias="maxSolutions", ge=0),
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
    ) -> TaskStatsPaginated:
        return await service.get_tasks_stats(
            page=page,
            per_page=per_page,
            user_id=user_id,
            min_width=min_width,
            max_width=max_width,
            min_height=min_height,
            max_height=max_height,
            min_solutions=min_solutions,
            max_solutions=max_solutions,
        )


@router.get("/search", response_model=TaskSearchPaginated)
async def search_tasks(
    page: int = Query(1, alias="page", ge=1),
    per_page: int = Query(100, alias="perPage", ge=1, le=200),
    min_width: int | None = Query(None, alias="minWidth", ge=0),
    max_width: int | None = Query(None, alias="maxWidth", ge=0),
    min_height: int | None = Query(None, alias="minHeight", ge=0),
    max_height: int | None = Query(None, alias="maxHeight", ge=0),
    min_solutions: int | None = Query(None, alias="minSolutions", ge=0),
    max_solutions: int | None = Query(None, alias="maxSolutions", ge=0),
    same_size: bool | None = Query(None, alias="sameSize"),
    min_width_delta: int | None = Query(None, alias="minWidthDelta"),
    max_width_delta: int | None = Query(None, alias="maxWidthDelta"),
    min_height_delta: int | None = Query(None, alias="minHeightDelta"),
    max_height_delta: int | None = Query(None, alias="maxHeightDelta"),
    all_inputs_same: bool | None = Query(None, alias="allInputsSame"),
    all_outputs_same: bool | None = Query(None, alias="allOutputsSame"),
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> TaskSearchPaginated:
    return await service.search_tasks(
        page=page,
        per_page=per_page,
        min_width=min_width,
        max_width=max_width,
        min_height=min_height,
        max_height=max_height,
        min_solutions=min_solutions,
        max_solutions=max_solutions,
        same_size=same_size,
        min_width_delta=min_width_delta,
        max_width_delta=max_width_delta,
        min_height_delta=min_height_delta,
        max_height_delta=max_height_delta,
        all_inputs_same=all_inputs_same,
        all_outputs_same=all_outputs_same,
    )


@router.get("/{task_id}/solvers", response_model=list[TaskSolverRead])
async def get_task_solvers(
    task_id: str,
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[TaskSolverRead]:
    return await service.get_task_solvers(task_id=task_id)
