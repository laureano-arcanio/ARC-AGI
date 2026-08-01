from unittest.mock import Mock

import pytest

from app.errors import ObjectNotFoundError
from app.models.batch import Batch
from app.models.user_review import UserReview
from app.repositories.batch import BatchAssignmentRepository, BatchRepository
from app.repositories.user_review import UserReviewRepository
from tests.conftest import MockAsyncSession, MockResult


class _CapturingSession(MockAsyncSession):
    def __init__(self, result: MockResult):
        super().__init__()
        self._result = result
        self.queries: list[str] = []

    async def execute(self, query):  # type: ignore[no-untyped-def]
        self.queries.append(
            str(query.compile(compile_kwargs={"literal_binds": True}))
        )
        return self._result


def _batch(id: int, name: str, batch_type: str = "solver") -> Batch:
    return Batch(id=id, name=name, batch_type=batch_type, task_ids=["t1"])


class TestBatchRepositoryGetBatchesForUser:
    async def test_filters_by_batch_type(self, db_session: MockAsyncSession) -> None:
        repo = BatchRepository(db_session=db_session)
        db_session.set_execute_result(
            MockResult(scalars_all_result=[_batch(2, "B", "review")])
        )
        result = await repo.get_batches_for_user(1, batch_type="review")
        assert len(result) == 1
        assert result[0].batch_type == "review"

    async def test_returns_all_when_type_none(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = BatchRepository(db_session=db_session)
        db_session.set_execute_result(
            MockResult(scalars_all_result=[_batch(1, "A"), _batch(2, "B", "review")])
        )
        result = await repo.get_batches_for_user(1)
        assert len(result) == 2


class TestBatchRepositoryTaskIds:
    async def test_accessible_task_ids_filters_solver_batches(self) -> None:
        session = _CapturingSession(
            MockResult(
                scalars_all_result=[
                    Batch(id=1, name="A", batch_type="solver", task_ids=["t1", "t2"]),
                ]
            )
        )
        repo = BatchRepository(db_session=session)
        result = await repo.get_accessible_task_ids(1)
        assert result == ["t1", "t2"]
        assert "batch_type" in session.queries[-1]
        assert "'solver'" in session.queries[-1]

    async def test_accessible_task_ids_dedupes(self) -> None:
        session = _CapturingSession(
            MockResult(
                scalars_all_result=[
                    Batch(id=1, name="A", batch_type="solver", task_ids=["t2", "t1"]),
                    Batch(id=3, name="C", batch_type="solver", task_ids=["t1"]),
                ]
            )
        )
        repo = BatchRepository(db_session=session)
        result = await repo.get_accessible_task_ids(1)
        assert result == ["t1", "t2"]

    async def test_user_review_task_ids_filters_review_batches(self) -> None:
        session = _CapturingSession(
            MockResult(
                scalars_all_result=[
                    Batch(
                        id=2,
                        name="R",
                        batch_type="review",
                        task_ids=["gen_1", "gen_2"],
                    ),
                ]
            )
        )
        repo = BatchRepository(db_session=session)
        result = await repo.get_user_review_task_ids(1)
        assert result == ["gen_1", "gen_2"]
        assert "batch_type" in session.queries[-1]
        assert "'review'" in session.queries[-1]


class TestBatchRepositoryAccess:
    async def test_user_has_review_access_true(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = BatchRepository(db_session=db_session)
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=Mock()))
        assert await repo.user_has_review_access(1, "gen_1") is True

    async def test_user_has_review_access_false(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = BatchRepository(db_session=db_session)
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        assert await repo.user_has_review_access(1, "gen_1") is False


class TestBatchAssignmentRepositoryGetByBatchAndUser:
    async def test_raises_when_not_found(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = BatchAssignmentRepository(db_session=db_session)
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await repo.get_by_batch_and_user(1, 2)


class TestUserReviewRepository:
    async def test_get_by_user_and_task_not_found(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = UserReviewRepository(db_session=db_session)
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await repo.get_by_user_and_task(1, "gen_1")

    async def test_get_by_user_and_tasks_empty(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = UserReviewRepository(db_session=db_session)
        assert await repo.get_by_user_and_tasks(1, []) == []

    async def test_upsert_creates_new(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = UserReviewRepository(db_session=db_session)
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        instance = await repo.upsert(1, "gen_1", {"status": "done"})
        assert instance.user_id == 1
        assert instance.synth_task_id == "gen_1"
        assert instance.status == "done"
        assert len(db_session.added) == 1

    async def test_upsert_updates_existing(
        self, db_session: MockAsyncSession
    ) -> None:
        repo = UserReviewRepository(db_session=db_session)
        existing = UserReview(
            id=1, user_id=1, synth_task_id="gen_1", status="pending_review", notes=[]
        )
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=existing)
        )
        instance = await repo.upsert(1, "gen_1", {"verified": True})
        assert instance.verified is True
        assert len(db_session.added) == 0
