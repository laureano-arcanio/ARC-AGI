from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import AdminDep, CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.synthetic_review import SyntheticReviewRead, SyntheticTaskRead
from app.schemas.user_review import UserReviewUpdate
from app.services.synthetic_task import SyntheticTaskService
from app.services.user_review import UserReviewService

router = APIRouter(prefix="/api/v1/synthetic-tasks", tags=["synthetic-tasks"])


def get_service() -> SyntheticTaskService:
    return SyntheticTaskService()


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


async def get_review_service(db_session: DatabaseSession) -> UserReviewService:
    return UserReviewService(
        repository=UserReviewRepository(db_session=db_session),
        batch_repository=BatchRepository(db_session=db_session),
    )


@router.get("/models", response_model=list[str])
async def list_models(
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[str]:
    return service.list_models()


@router.get("/resolve/{entry_id}", response_model=list[SyntheticTaskRead])
async def resolve_synthetic_tasks(
    entry_id: str,
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[SyntheticTaskRead]:
    if current_user.role != "admin":
        has_access = await batch_repo.user_has_review_access(
            current_user.user_id, entry_id
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access these synthetic tasks",
            )
    return service.resolve_entry(entry_id)


@router.get("/{synth_task_id}", response_model=SyntheticTaskRead)
async def get_synthetic_task(
    synth_task_id: str,
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> SyntheticTaskRead:
    if current_user.role != "admin":
        has_access = await batch_repo.user_has_review_access(
            current_user.user_id, synth_task_id
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this synthetic task",
            )
    task = service.get_task(synth_task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Synthetic task not found",
        )
    return task


@router.get("/{synth_task_id}/review", response_model=SyntheticReviewRead)
async def get_review(
    synth_task_id: str,
    service: UserReviewService = Depends(get_review_service),  # noqa: B008
    admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticReviewRead:
    review = await service.get_admin_review(admin.user_id, synth_task_id)
    return SyntheticReviewRead(
        synth_task_id=synth_task_id,
        status=review.status,
        correct=review.correct,
        verified=review.verified,
        notes=review.notes,
    )


@router.put("/{synth_task_id}/review", response_model=SyntheticReviewRead)
async def update_review(
    synth_task_id: str,
    data: UserReviewUpdate,
    service: UserReviewService = Depends(get_review_service),  # noqa: B008
    admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticReviewRead:
    review = await service.update_admin_review(admin.user_id, synth_task_id, data)
    return SyntheticReviewRead(
        synth_task_id=synth_task_id,
        status=review.status,
        correct=review.correct,
        verified=review.verified,
        notes=review.notes,
    )
