import pytest

from app.errors import ObjectNotFoundError
from app.models.review import PeerReviewPair, Review, ReviewTag
from app.repositories.review import (
    PeerReviewPairRepository,
    ReviewRepository,
    ReviewTagRepository,
)
from tests.conftest import MockAsyncSession, MockResult


@pytest.fixture
def pair_repo(db_session: MockAsyncSession) -> PeerReviewPairRepository:
    return PeerReviewPairRepository(db_session=db_session)


@pytest.fixture
def review_repo(db_session: MockAsyncSession) -> ReviewRepository:
    return ReviewRepository(db_session=db_session)


@pytest.fixture
def tag_repo(db_session: MockAsyncSession) -> ReviewTagRepository:
    return ReviewTagRepository(db_session=db_session)


class TestPeerReviewPairRepositoryGetAll:
    async def test_returns_empty_list(
        self, pair_repo: PeerReviewPairRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await pair_repo.get_all()
        assert result == []

    async def test_returns_list(
        self, pair_repo: PeerReviewPairRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=[
                PeerReviewPair(id=1, solver_a_id=1, solver_b_id=2),
            ])
        )
        result = await pair_repo.get_all()
        assert len(result) == 1
        assert result[0].solver_a_id == 1
        assert result[0].solver_b_id == 2


class TestPeerReviewPairRepositoryGetPairedSolverIds:
    async def test_returns_paired_ids(
        self, pair_repo: PeerReviewPairRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=[
                PeerReviewPair(id=1, solver_a_id=1, solver_b_id=2),
                PeerReviewPair(id=2, solver_a_id=3, solver_b_id=1),
            ])
        )
        result = await pair_repo.get_paired_solver_ids(1)
        assert set(result) == {2, 3}

    async def test_returns_empty_when_no_pairs(
        self, pair_repo: PeerReviewPairRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await pair_repo.get_paired_solver_ids(1)
        assert result == []


class TestReviewRepositoryCreate:
    async def test_creates_instance(
        self, review_repo: ReviewRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        data = {
            "reviewer_id": 1, "solver_id": 2, "task_id": "abc",
            "status": "assigned",
        }
        result = await review_repo.create(data)
        assert result.reviewer_id == 1
        assert result.solver_id == 2
        assert result.task_id == "abc"
        assert len(db_session.added) == 1
        assert db_session.flushed is True


class TestReviewRepositoryGetByReviewerSolverTask:
    async def test_returns_none_when_not_found(
        self, review_repo: ReviewRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        result = await review_repo.get_by_reviewer_solver_task(1, 2, "abc")
        assert result is None

    async def test_returns_instance_when_found(
        self, review_repo: ReviewRepository, db_session: MockAsyncSession
    ) -> None:
        instance = Review(
            id=1, reviewer_id=1, solver_id=2, task_id="abc",
            status="assigned",
        )
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=instance))
        result = await review_repo.get_by_reviewer_solver_task(1, 2, "abc")
        assert result is not None
        assert result.id == 1
        assert result.status == "assigned"


class TestReviewTagRepositoryCreate:
    async def test_creates_tag(
        self, tag_repo: ReviewTagRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        data = {"review_id": 1, "solver_node_id": "node_001", "quality": "good"}
        result = await tag_repo.create(data)
        assert result.solver_node_id == "node_001"
        assert result.quality == "good"
        assert len(db_session.added) == 1


class TestReviewTagRepositoryGetByReview:
    async def test_returns_tags(
        self, tag_repo: ReviewTagRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=[
                ReviewTag(
                    id=1, review_id=1, solver_node_id="node_001",
                    quality="good",
                ),
                ReviewTag(
                    id=2, review_id=1, solver_node_id="node_002",
                    quality="wrong",
                ),
            ])
        )
        result = await tag_repo.get_by_review(1)
        assert len(result) == 2
        assert result[0].quality == "good"
        assert result[1].quality == "wrong"


class TestReviewTagRepositoryDelete:
    async def test_deletes_tag(
        self, tag_repo: ReviewTagRepository, db_session: MockAsyncSession
    ) -> None:
        instance = ReviewTag(
            id=1, review_id=1, solver_node_id="node_001", quality="good",
        )
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=instance))
        await tag_repo.delete(1)
        assert len(db_session.deleted) == 1
        assert db_session.flushed is True

    async def test_raises_when_not_found(
        self, tag_repo: ReviewTagRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await tag_repo.delete(999)
