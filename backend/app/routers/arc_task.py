from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.repositories.review import PeerReviewPairRepository
from app.schemas.arc_task import ArcTaskRead
from app.services.arc_task import ArcTaskService

router = APIRouter(prefix="/api/v1/arc-tasks", tags=["arc-tasks"])


def get_service() -> ArcTaskService:
    return ArcTaskService()


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


async def get_pair_repo(db_session: DatabaseSession) -> PeerReviewPairRepository:
    return PeerReviewPairRepository(db_session=db_session)


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
    pair_repo: PeerReviewPairRepository = Depends(get_pair_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ArcTaskRead:
    is_admin = current_user.role == "admin"
    allowed = is_admin
    if not allowed:
        allowed = await batch_repo.user_has_access(
            current_user.user_id, task_id
        )
    if not allowed:
        # A paired reviewer may view a task that any of their paired solvers
        # has been assigned.
        paired_ids = await pair_repo.get_paired_solver_ids(
            current_user.user_id
        )
        for solver_id in paired_ids:
            if await batch_repo.user_has_access(solver_id, task_id):
                allowed = True
                break
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this task",
        )
    # Only admins receive the test solutions; solvers and reviewers get inputs.
    task = await service.get_by_id(task_id, include_test_outputs=is_admin)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task
