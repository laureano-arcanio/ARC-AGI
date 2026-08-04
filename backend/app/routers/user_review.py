from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AdminDep, CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.user import UserRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.user_review import (
    ReviewEntryProgress,
    SolverReviewDetail,
    UserReviewRead,
    UserReviewUpdate,
)
from app.services.user_review import UserReviewService

router = APIRouter(prefix="/api/v1/user-reviews", tags=["user-reviews"])


def get_review_repo(db_session: DatabaseSession) -> UserReviewRepository:
    return UserReviewRepository(db_session=db_session)


async def get_service(db_session: DatabaseSession) -> UserReviewService:
    repository = UserReviewRepository(db_session=db_session)
    batch_repository = BatchRepository(db_session=db_session)
    return UserReviewService(
        repository=repository,
        batch_repository=batch_repository,
        user_repository=UserRepository(db_session=db_session),
        event_repository=EventRepository(db_session=db_session),
    )


@router.get("/tasks", response_model=list[UserReviewRead])
async def list_user_reviews(
    task_ids: str = Query("", alias="taskIds"),
    service: UserReviewService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[UserReviewRead]:
    ids = [tid.strip() for tid in task_ids.split(",") if tid.strip()]
    return await service.list_for_user_tasks(current_user.user_id, ids)


@router.get("/progress", response_model=list[ReviewEntryProgress])
async def list_review_progress(
    task_ids: str = Query("", alias="taskIds"),
    service: UserReviewService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[ReviewEntryProgress]:
    ids = [tid.strip() for tid in task_ids.split(",") if tid.strip()]
    return await service.list_progress(current_user.user_id, ids)


@router.get("/by-original/{original_task_id}", response_model=list[SolverReviewDetail])
async def list_solver_review_details(
    original_task_id: str,
    service: UserReviewService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[SolverReviewDetail]:
    return await service.get_solver_review_details(original_task_id)


@router.get("/{synth_task_id}", response_model=UserReviewRead)
async def get_user_review(
    synth_task_id: str,
    service: UserReviewService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> UserReviewRead:
    return await service.get_review(current_user.user_id, synth_task_id)


@router.post("/{synth_task_id}/start", response_model=UserReviewRead)
async def start_user_review(
    synth_task_id: str,
    service: UserReviewService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> UserReviewRead:
    return await service.start_review(current_user.user_id, synth_task_id)


@router.put("/{synth_task_id}", response_model=UserReviewRead)
async def update_user_review(
    synth_task_id: str,
    data: UserReviewUpdate,
    service: UserReviewService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> UserReviewRead:
    return await service.update_review(current_user.user_id, synth_task_id, data)
