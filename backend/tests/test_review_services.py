from unittest.mock import AsyncMock

import pytest

from app.errors import ObjectNotFoundError
from app.models.review import PeerReviewPair, Review, ReviewTag
from app.schemas.review import (
    PeerReviewPairCreate,
    PeerReviewPairRead,
    ReviewRead,
    ReviewTagCreate,
    ReviewTagRead,
)
from app.services.review import PeerReviewPairService, ReviewService, ReviewTagService


@pytest.fixture
def mock_pair_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side(data):
        return PeerReviewPair(id=1, **data)

    repo.get_all.return_value = []
    repo.get_by_id.side_effect = ObjectNotFoundError("PeerReviewPair", 0)
    repo.create.side_effect = create_side
    repo.delete.return_value = None
    return repo


@pytest.fixture
def pair_service(mock_pair_repo: AsyncMock) -> PeerReviewPairService:
    svc = PeerReviewPairService(repository=mock_pair_repo)
    svc.read_schema = PeerReviewPairRead
    return svc


@pytest.fixture
def mock_review_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side(data):
        data_with_status = {**data, "status": data.get("status", "assigned")}
        return Review(id=1, **data_with_status)

    async def update_side(id, data):
        base = {
            "id": id, "reviewer_id": 1, "solver_id": 2, "task_id": "abc",
            "status": "assigned",
        }
        return Review(**{**base, **data})

    repo.get_by_id.side_effect = ObjectNotFoundError("Review", 0)
    repo.get_by_reviewer_solver_task.return_value = None
    repo.get_by_solver_and_task.return_value = []
    repo.get_for_reviewer.return_value = []
    repo.create.side_effect = create_side
    repo.update.side_effect = update_side
    return repo


@pytest.fixture
def mock_tag_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side(data):
        return ReviewTag(id=1, **data)

    repo.get_by_review.return_value = []
    repo.create.side_effect = create_side
    repo.delete.side_effect = ObjectNotFoundError("ReviewTag", 0)
    return repo


class TestPeerReviewPairService:
    async def test_create_returns_schema(
        self, pair_service: PeerReviewPairService, mock_pair_repo: AsyncMock
    ) -> None:
        result = await pair_service.create(
            PeerReviewPairCreate(solver_a_id=1, solver_b_id=2)
        )
        assert isinstance(result, PeerReviewPairRead)
        assert result.solver_a_id == 1
        assert result.solver_b_id == 2
        mock_pair_repo.create.assert_awaited_with(
            {"solver_a_id": 1, "solver_b_id": 2}
        )

    async def test_get_all_returns_list(
        self, pair_service: PeerReviewPairService, mock_pair_repo: AsyncMock
    ) -> None:
        mock_pair_repo.get_all.return_value = [
            PeerReviewPair(id=1, solver_a_id=1, solver_b_id=2),
        ]
        result = await pair_service.get_all()
        assert len(result) == 1
        assert isinstance(result[0], PeerReviewPairRead)


class TestReviewService:
    async def test_get_or_create_creates_new(
        self, mock_review_repo: AsyncMock
    ) -> None:
        svc = ReviewService(repository=mock_review_repo)
        svc.read_schema = ReviewRead
        result = await svc.get_or_create(1, 2, "abc")
        assert isinstance(result, ReviewRead)
        assert result.reviewer_id == 1
        assert result.solver_id == 2
        assert result.task_id == "abc"

    async def test_get_or_create_returns_existing(
        self, mock_review_repo: AsyncMock
    ) -> None:
        mock_review_repo.get_by_reviewer_solver_task.return_value = Review(
            id=5, reviewer_id=1, solver_id=2, task_id="abc", status="assigned"
        )
        svc = ReviewService(repository=mock_review_repo)
        svc.read_schema = ReviewRead
        result = await svc.get_or_create(1, 2, "abc")
        assert isinstance(result, ReviewRead)
        assert result.id == 5
        mock_review_repo.create.assert_not_called()

    async def test_update_returns_schema(
        self, mock_review_repo: AsyncMock
    ) -> None:
        mock_review_repo.get_by_id.side_effect = None
        mock_review_repo.get_by_id.return_value = Review(
            id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned", tags=[]
        )
        from app.schemas.review import ReviewUpdate
        svc = ReviewService(repository=mock_review_repo)
        svc.read_schema = ReviewRead
        result = await svc.update(1, ReviewUpdate(status="completed"))
        assert isinstance(result, ReviewRead)
        assert result.status == "completed"

    async def test_get_by_id_returns_schema(
        self, mock_review_repo: AsyncMock
    ) -> None:
        mock_review_repo.get_by_id.side_effect = None
        mock_review_repo.get_by_id.return_value = Review(
            id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned", tags=[]
        )
        svc = ReviewService(repository=mock_review_repo)
        svc.read_schema = ReviewRead
        result = await svc.get_by_id(1)
        assert isinstance(result, ReviewRead)
        assert result.id == 1


class TestReviewTagService:
    async def test_create_tag_returns_schema(
        self, mock_tag_repo: AsyncMock
    ) -> None:
        mock_tag_repo.create.side_effect = lambda d: ReviewTag(id=1, review_id=1, **d)
        svc = ReviewTagService(repository=mock_tag_repo)
        svc.read_schema = ReviewTagRead
        result = await svc.create(
            ReviewTagCreate(solver_node_id="node_001", quality="good")
        )
        assert isinstance(result, ReviewTagRead)
        assert result.quality == "good"

    async def test_get_by_review_returns_list(
        self, mock_tag_repo: AsyncMock
    ) -> None:
        mock_tag_repo.get_by_review.return_value = [
            ReviewTag(id=1, review_id=1, solver_node_id="node_001", quality="good"),
        ]
        svc = ReviewTagService(repository=mock_tag_repo)
        svc.read_schema = ReviewTagRead
        result = await svc.get_by_review(1)
        assert len(result) == 1
        assert isinstance(result[0], ReviewTagRead)
