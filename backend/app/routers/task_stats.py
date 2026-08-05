from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import AdminDep, CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.batch import BatchRepository
from app.schemas.task_stats import (
    MyHypothesisRead,
    MyHypothesisUpdate,
    TaskReviewGroupListRead,
    TaskSearchPaginated,
    TaskSolverAnonRead,
    TaskSolverRead,
    TaskStatsPaginated,
)
from app.services.synthetic_task import SyntheticTaskService
from app.services.task_stats import TaskStatsService

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


async def get_service(db_session: DatabaseSession) -> TaskStatsService:
    return TaskStatsService(db_session=db_session)


async def get_batch_repo(db_session: DatabaseSession) -> BatchRepository:
    return BatchRepository(db_session=db_session)


async def _require_review_access(
    task_id: str,
    batch_repo: BatchRepository,
    current_user: CurrentUserDep,
) -> None:
    review_ids = await batch_repo.get_user_review_task_ids(
        current_user.user_id
    )
    if not SyntheticTaskService.user_can_review_original(task_id, review_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these solutions",
        )


@router.get("/", response_model=TaskStatsPaginated)
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
    solver_email: str | None = Query(None, alias="solverEmail"),
    hypothesis_text: str | None = Query(None, alias="hypothesisText"),
    task_id_filter: str | None = Query(None, alias="taskId"),
    dataset: str | None = Query(None),
    has_tags: str | None = Query(None, alias="hasTags"),
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
        solver_email=solver_email,
        hypothesis_text=hypothesis_text,
        task_id_filter=task_id_filter,
        dataset=dataset,
        has_tags=has_tags,
    )


@router.get("/review-groups", response_model=TaskReviewGroupListRead)
async def search_review_groups(
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
    solver_email: str | None = Query(None, alias="solverEmail"),
    hypothesis_text: str | None = Query(None, alias="hypothesisText"),
    task_id_filter: str | None = Query(None, alias="taskId"),
    dataset: str | None = Query(None),
    has_tags: str | None = Query(None, alias="hasTags"),
    model_name: str | None = Query(None, alias="modelName"),
    concept: str | None = Query(None, alias="concept"),
    witness_passed: bool | None = Query(None, alias="witnessPassed"),
    original_task_id: str | None = Query(None, alias="originalTaskId"),
    only_multiple_variants: bool = Query(False, alias="onlyMultipleVariants"),
    user_review_status: str | None = Query(None, alias="userReviewStatus"),
    reviewer_user_id: int | None = Query(None, alias="reviewerUserId"),
    reviewer_email: str | None = Query(None, alias="reviewerEmail"),
    min_incorrect_marks: int | None = Query(None, alias="minIncorrectMarks", ge=1),
    admin_review_status: str | None = Query(None, alias="adminReviewStatus"),
    admin_correct: bool | None = Query(None, alias="adminCorrect"),
    admin_verified: bool | None = Query(None, alias="adminVerified"),
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    admin: AdminDep = None,  # type: ignore[assignment]
) -> TaskReviewGroupListRead:
    return await service.search_review_groups(
        page=page,
        per_page=per_page,
        admin_user_id=admin.user_id,
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
        solver_email=solver_email,
        hypothesis_text=hypothesis_text,
        task_id_filter=task_id_filter,
        dataset=dataset,
        has_tags=has_tags,
        model_name=model_name,
        concept=concept,
        witness_passed=witness_passed,
        original_task_id=original_task_id,
        only_multiple_variants=only_multiple_variants,
        user_review_status=user_review_status,
        reviewer_user_id=reviewer_user_id,
        reviewer_email=reviewer_email,
        min_incorrect_marks=min_incorrect_marks,
        admin_review_status=admin_review_status,
        admin_correct=admin_correct,
        admin_verified=admin_verified,
    )


@router.get("/{task_id}/solvers", response_model=list[TaskSolverRead])
async def get_task_solvers(
    task_id: str,
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[TaskSolverRead]:
    return await service.get_task_solvers(task_id=task_id)


@router.get(
    "/{task_id}/solvers-public", response_model=list[TaskSolverAnonRead]
)
async def get_task_solvers_public(
    task_id: str,
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[TaskSolverAnonRead]:
    await _require_review_access(task_id, batch_repo, current_user)
    return await service.get_task_solvers_anon(
        task_id=task_id, exclude_user_id=current_user.user_id
    )


@router.get("/{task_id}/my-hypothesis", response_model=MyHypothesisRead)
async def get_my_hypothesis(
    task_id: str,
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> MyHypothesisRead:
    await _require_review_access(task_id, batch_repo, current_user)
    hypothesis = await service.get_my_hypothesis(
        task_id=task_id, user_id=current_user.user_id
    )
    return MyHypothesisRead(hypothesis=hypothesis)


@router.put("/{task_id}/my-hypothesis", response_model=MyHypothesisRead)
async def update_my_hypothesis(
    task_id: str,
    data: MyHypothesisUpdate,
    service: TaskStatsService = Depends(get_service),  # noqa: B008
    batch_repo: BatchRepository = Depends(get_batch_repo),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> MyHypothesisRead:
    await _require_review_access(task_id, batch_repo, current_user)
    hypothesis = await service.save_my_hypothesis(
        task_id=task_id, user_id=current_user.user_id, hypothesis=data.hypothesis
    )
    return MyHypothesisRead(hypothesis=hypothesis)
