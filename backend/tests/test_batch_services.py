from unittest.mock import AsyncMock

from app.models.batch import Batch
from app.repositories.batch import BatchRepository
from app.services.batch import BatchService


def _make_service(repo: AsyncMock) -> BatchService:
    return BatchService(repository=repo)


class TestBatchServiceToRead:
    async def test_includes_batch_type(self) -> None:
        service = _make_service(AsyncMock(spec=BatchRepository))
        instance = Batch(
            id=1,
            name="Lote",
            batch_type="review",
            task_ids=["gen_1"],
        )
        result = service._to_read(instance)
        assert result.batch_type == "review"
        assert result.id == 1
        assert result.task_ids == ["gen_1"]

    async def test_defaults_batch_type_to_solver(self) -> None:
        service = _make_service(AsyncMock(spec=BatchRepository))
        instance = Batch(id=2, name="A", task_ids=["t1"])
        result = service._to_read(instance)
        assert result.batch_type == "solver"


class TestBatchServiceDelegates:
    async def test_get_batches_for_user_forwards_type(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.get_batches_for_user.return_value = []
        service = _make_service(repo)
        await service.get_batches_for_user(1, batch_type="review")
        repo.get_batches_for_user.assert_awaited_once_with(
            1, batch_type="review"
        )

    async def test_get_accessible_task_ids_forwards(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.get_accessible_task_ids.return_value = ["t1"]
        service = _make_service(repo)
        result = await service.get_accessible_task_ids(1)
        assert result == ["t1"]

    async def test_user_has_review_access_forwards(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.user_has_review_access.return_value = True
        service = _make_service(repo)
        assert await service.user_has_review_access(1, "gen_1") is True
