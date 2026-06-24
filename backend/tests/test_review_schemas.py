import pytest
from pydantic import ValidationError

from app.schemas.review import (
    PeerReviewPairCreate,
    PeerReviewPairRead,
    ReviewCreate,
    ReviewRead,
    ReviewTagCreate,
    ReviewTagRead,
    ReviewTaskSummary,
    ReviewUpdate,
)


class TestPeerReviewPairCreate:
    def test_valid_create(self) -> None:
        data = PeerReviewPairCreate(solver_a_id=1, solver_b_id=2)
        assert data.solver_a_id == 1
        assert data.solver_b_id == 2

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            PeerReviewPairCreate()

    def test_model_dump(self) -> None:
        data = PeerReviewPairCreate(solver_a_id=1, solver_b_id=2)
        dumped = data.model_dump()
        assert dumped == {"solver_a_id": 1, "solver_b_id": 2}

    def test_camelcase_alias(self) -> None:
        data = PeerReviewPairCreate.model_construct(solver_a_id=1, solver_b_id=2)
        dumped = data.model_dump(by_alias=True)
        assert "solverAId" in dumped
        assert "solverBId" in dumped


class TestPeerReviewPairRead:
    def test_full_read(self) -> None:
        data = PeerReviewPairRead(id=1, solver_a_id=1, solver_b_id=2)
        assert data.id == 1
        assert data.solver_a_id == 1
        assert data.solver_b_id == 2

    def test_from_attributes(self) -> None:
        from app.models.review import PeerReviewPair

        instance = PeerReviewPair(id=1, solver_a_id=1, solver_b_id=2)
        data = PeerReviewPairRead.model_validate(instance)
        assert data.id == 1
        assert data.solver_a_id == 1
        assert data.solver_b_id == 2


class TestReviewCreate:
    def test_valid_create(self) -> None:
        data = ReviewCreate(reviewer_id=1, solver_id=2, task_id="abc")
        assert data.reviewer_id == 1
        assert data.solver_id == 2
        assert data.task_id == "abc"

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            ReviewCreate()


class TestReviewUpdate:
    def test_all_fields_optional(self) -> None:
        data = ReviewUpdate()
        assert data.status is None

    def test_partial_update(self) -> None:
        data = ReviewUpdate(status="completed")
        assert data.status == "completed"

    def test_exclude_unset(self) -> None:
        data = ReviewUpdate(status="completed")
        dumped = data.model_dump(exclude_unset=True)
        assert dumped == {"status": "completed"}


class TestReviewRead:
    def test_full_read(self) -> None:
        data = ReviewRead(
            id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned"
        )
        assert data.id == 1
        assert data.reviewer_id == 1
        assert data.solver_id == 2
        assert data.task_id == "abc"
        assert data.status == "assigned"
        assert data.tag_count == 0

    def test_default_tag_count(self) -> None:
        data = ReviewRead(
            id=1, reviewer_id=1, solver_id=2, task_id="abc",
            status="in_progress",
        )
        assert data.tag_count == 0


class TestReviewTagCreate:
    def test_valid_create(self) -> None:
        data = ReviewTagCreate(
            solver_node_id="node_001", quality="good",
        )
        assert data.solver_node_id == "node_001"
        assert data.quality == "good"

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValidationError):
            ReviewTagCreate()


class TestReviewTagRead:
    def test_full_read(self) -> None:
        data = ReviewTagRead(
            id=1, review_id=1, solver_node_id="node_001", quality="good",
        )
        assert data.id == 1
        assert data.review_id == 1
        assert data.solver_node_id == "node_001"
        assert data.quality == "good"


class TestReviewTaskSummary:
    def test_valid(self) -> None:
        data = ReviewTaskSummary(
            task_id="abc", solver_id=2,
            attempt_count=0, solved=False, status="not_started",
        )
        assert data.task_id == "abc"
        assert data.solver_id == 2
