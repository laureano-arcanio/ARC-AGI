from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import AdminDep, CurrentUserDep, require_owner_or_admin
from app.dependencies.database import DatabaseSession
from app.repositories.review import (
    PeerReviewPairRepository,
    ReviewRepository,
    ReviewTagRepository,
)
from app.schemas.review import (
    PeerReviewPairCreate,
    PeerReviewPairRead,
    ReviewCreate,
    ReviewRead,
    ReviewSolverRead,
    ReviewTagCreate,
    ReviewTagRead,
    ReviewTaskSummary,
    ReviewUpdate,
)
from app.services.review import (
    PeerReviewPairService,
    ReviewService,
    ReviewTagService,
)

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


async def get_pair_service(
    db_session: DatabaseSession,
) -> PeerReviewPairService:
    repository = PeerReviewPairRepository(db_session=db_session)
    return PeerReviewPairService(repository=repository)


async def get_review_service(
    db_session: DatabaseSession,
) -> ReviewService:
    repository = ReviewRepository(db_session=db_session)
    return ReviewService(repository=repository)


async def get_tag_service(
    db_session: DatabaseSession,
) -> ReviewTagService:
    repository = ReviewTagRepository(db_session=db_session)
    return ReviewTagService(repository=repository)


@router.post(
    "/pairs",
    response_model=PeerReviewPairRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_pair(
    data: PeerReviewPairCreate,
    service: PeerReviewPairService = Depends(get_pair_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> PeerReviewPairRead:
    return await service.create(data)


@router.get("/pairs", response_model=list[PeerReviewPairRead])
async def list_pairs(
    service: PeerReviewPairService = Depends(get_pair_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[PeerReviewPairRead]:
    return await service.get_all_with_users()


@router.delete("/pairs/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pair(
    id: int,
    service: PeerReviewPairService = Depends(get_pair_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(id)


@router.get(
    "/pending/{user_id}",
    response_model=list[ReviewTaskSummary],
)
async def get_pending_reviews(
    user_id: int,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[ReviewTaskSummary]:
    require_owner_or_admin(user_id, current_user)
    return await service.get_pending_reviews(user_id)


@router.post(
    "/",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    data: ReviewCreate,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ReviewRead:
    require_owner_or_admin(data.reviewer_id, current_user)
    return await service.get_or_create(
        data.reviewer_id,
        data.solver_id,
        data.task_id,
        is_admin=current_user.role == "admin",
    )


@router.get("/{id}", response_model=ReviewRead)
async def get_review(
    id: int,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ReviewRead:
    review = await service.get_by_id(id)
    require_owner_or_admin(review.reviewer_id, current_user)
    return review


@router.put("/{id}", response_model=ReviewRead)
async def update_review(
    id: int,
    data: ReviewUpdate,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ReviewRead:
    review = await service.get_by_id(id)
    require_owner_or_admin(review.reviewer_id, current_user)
    return await service.update(id, data)


@router.get(
    "/solver/{solver_id}/task/{task_id}",
    response_model=list[ReviewRead],
)
async def get_review_by_solver_and_task_admin(
    solver_id: int,
    task_id: str,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[ReviewRead]:
    return await service.get_review_by_solver_and_task(solver_id, task_id)


@router.get(
    "/cross/{solver_id}/task/{task_id}",
    response_model=list[ReviewSolverRead],
)
async def get_review_by_solver_and_task_cross(
    solver_id: int,
    task_id: str,
    service: ReviewService = Depends(get_review_service),  # noqa: B008
    db_session: DatabaseSession = None,  # type: ignore[assignment]
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[ReviewSolverRead]:
    pair_repo = PeerReviewPairRepository(db_session=db_session)
    paired_ids = await pair_repo.get_paired_solver_ids(current_user.user_id)
    if solver_id not in paired_ids and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not paired with this solver",
        )
    reviews = await service.get_review_by_solver_and_task(solver_id, task_id)
    my_reviews = [r for r in reviews if r.reviewer_id == current_user.user_id]
    return [
        ReviewSolverRead.model_validate(
            r.model_dump(exclude={"solver_id"})
        )
        for r in my_reviews
    ]


@router.get(
    "/{review_id}/tags",
    response_model=list[ReviewTagRead],
)
async def list_tags(
    review_id: int,
    service: ReviewTagService = Depends(get_tag_service),  # noqa: B008
    review_service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[ReviewTagRead]:
    review = await review_service.get_by_id(review_id)
    require_owner_or_admin(review.reviewer_id, current_user)
    return await service.get_by_review(review_id)


@router.post(
    "/{review_id}/tags",
    response_model=ReviewTagRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_tag(
    review_id: int,
    data: ReviewTagCreate,
    service: ReviewTagService = Depends(get_tag_service),  # noqa: B008
    review_service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> ReviewTagRead:
    review = await review_service.get_by_id(review_id)
    require_owner_or_admin(review.reviewer_id, current_user)
    return await service.create_tag(
        review_id,
        data,
        review.reviewer_id,
        review.solver_id,
        review.task_id,
    )


@router.delete(
    "/{review_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_tag(
    review_id: int,
    tag_id: int,
    service: ReviewTagService = Depends(get_tag_service),  # noqa: B008
    review_service: ReviewService = Depends(get_review_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> None:
    review = await review_service.get_by_id(review_id)
    require_owner_or_admin(review.reviewer_id, current_user)
    await service.delete_tag(review_id, tag_id)
