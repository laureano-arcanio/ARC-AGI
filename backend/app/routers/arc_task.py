from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.schemas.arc_task import ArcTaskRead
from app.services.arc_task import ArcTaskService
from app.services.synthetic_task import SyntheticTaskService

router = APIRouter(prefix="/api/v1/arc-tasks", tags=["arc-tasks"])


def get_service() -> ArcTaskService:
    return ArcTaskService()


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


@router.get("/random", response_model=list[ArcTaskRead])
async def get_random_tasks(
    count: int = Query(10, ge=1, le=100),
    service: ArcTaskService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[ArcTaskRead]:
    allowed_ids = await batch_repo.get_accessible_task_ids(current_user.user_id)
    if not allowed_ids:
        return []
    return await service.get_random_tasks_from_ids(
        count=count, allowed_ids=allowed_ids
    )


@router.get("/{task_id}", response_model=ArcTaskRead)
async def get_task(
    task_id: str,
    service: ArcTaskService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ArcTaskRead:
    is_admin = current_user.role == "admin"
    allowed = is_admin
    has_review_access = False
    if not allowed:
        allowed = await batch_repo.user_has_access(
            current_user.user_id, task_id
        )
    if not allowed:
        review_ids = await batch_repo.get_user_review_task_ids(
            current_user.user_id
        )
        has_review_access = SyntheticTaskService.user_can_review_original(
            task_id, review_ids
        )
        allowed = has_review_access
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this task",
        )
    # Admins and reviewers receive the test solutions; solvers get inputs only.
    task = await service.get_by_id(
        task_id, include_test_outputs=is_admin or has_review_access
    )
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task
