from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AdminDep
from app.schemas.synthetic_review import (
    SyntheticReviewRead,
    SyntheticReviewUpdate,
    SyntheticTaskListRead,
    SyntheticTaskRead,
)
from app.services.synthetic_task import SyntheticTaskService

router = APIRouter(prefix="/api/v1/synthetic-tasks", tags=["synthetic-tasks"])


def get_service() -> SyntheticTaskService:
    return SyntheticTaskService()


@router.get("/models", response_model=list[str])
async def list_models(
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[str]:
    return service.list_models()


@router.get("", response_model=SyntheticTaskListRead)
async def list_synthetic_tasks(
    page: int = Query(1, alias="page", ge=1),
    per_page: int = Query(50, alias="perPage", ge=1, le=200),
    model_name: str | None = Query(None, alias="modelName"),
    witness_passed: bool | None = Query(None, alias="witnessPassed"),
    review_status: str | None = Query(None, alias="reviewStatus"),
    original_task_id: str | None = Query(None, alias="originalTaskId"),
    concept: str | None = Query(None, alias="concept"),
    correct: bool | None = Query(None, alias="correct"),
    verified: bool | None = Query(None, alias="verified"),
    only_multiple_variants: bool = Query(False, alias="onlyMultipleVariants"),
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticTaskListRead:
    return service.list_tasks(
        page=page,
        per_page=per_page,
        model_name=model_name,
        witness_passed=witness_passed,
        review_status=review_status,
        original_task_id=original_task_id,
        concept=concept,
        correct=correct,
        verified=verified,
        only_multiple_variants=only_multiple_variants,
    )


@router.get("/{synth_task_id}", response_model=SyntheticTaskRead)
async def get_synthetic_task(
    synth_task_id: str,
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticTaskRead:
    task = service.get_task(synth_task_id)
    if task is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Synthetic task not found")
    return task


@router.get("/{synth_task_id}/review", response_model=SyntheticReviewRead)
async def get_review(
    synth_task_id: str,
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticReviewRead:
    return service.get_review(synth_task_id)


@router.put("/{synth_task_id}/review", response_model=SyntheticReviewRead)
async def update_review(
    synth_task_id: str,
    data: SyntheticReviewUpdate,
    service: SyntheticTaskService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> SyntheticReviewRead:
    return service.update_review(synth_task_id, data)
