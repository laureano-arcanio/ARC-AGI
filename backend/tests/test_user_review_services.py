from unittest.mock import AsyncMock, patch

import pytest

from app.errors import ObjectNotFoundError
from app.models.user_review import UserReview
from app.repositories.batch import BatchRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.user_review import UserReviewUpdate
from app.services.synthetic_task import SyntheticTaskService
from app.services.user_review import UserReviewService


def _make_service(
    review_repo: AsyncMock, batch_repo: AsyncMock
) -> UserReviewService:
    return UserReviewService(
        repository=review_repo, batch_repository=batch_repo
    )


class TestUserReviewServiceGetReview:
    async def test_returns_default_when_no_record(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_by_user_and_task.side_effect = ObjectNotFoundError(
            object_type="UserReview", object_id="gen_1"
        )
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = ["gen_1"]
        service = _make_service(review_repo, batch_repo)
        result = await service.get_review(1, "gen_1")
        assert result.synth_task_id == "gen_1"
        assert result.status == "pending_review"
        assert result.notes == []

    async def test_returns_existing_record(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_by_user_and_task.return_value = UserReview(
            id=1,
            user_id=1,
            synth_task_id="gen_1",
            status="done",
            correct=True,
            verified=True,
            notes=["ok"],
        )
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = ["gen_1"]
        service = _make_service(review_repo, batch_repo)
        result = await service.get_review(1, "gen_1")
        assert result.status == "done"
        assert result.correct is True
        assert result.verified is True
        assert result.notes == ["ok"]

    async def test_denies_when_no_review_access(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = []
        service = _make_service(review_repo, batch_repo)
        with pytest.raises(ObjectNotFoundError):
            await service.get_review(1, "gen_1")


class TestUserReviewServiceUpdateReview:
    async def test_upserts(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.upsert.return_value = UserReview(
            id=1,
            user_id=1,
            synth_task_id="gen_1",
            status="done",
            notes=["n"],
        )
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = ["gen_1"]
        service = _make_service(review_repo, batch_repo)
        result = await service.update_review(
            1, "gen_1", UserReviewUpdate(status="done", notes=["n"])
        )
        assert result.status == "done"
        review_repo.upsert.assert_awaited_once()

    async def test_denies_when_no_review_access(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = []
        service = _make_service(review_repo, batch_repo)
        with pytest.raises(ObjectNotFoundError):
            await service.update_review(1, "gen_1", UserReviewUpdate())


class TestUserReviewServiceListForUserTasks:
    async def test_filters_to_allowed_tasks(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_by_user_and_tasks.return_value = [
            UserReview(
                id=1,
                user_id=1,
                synth_task_id="gen_2",
                status="done",
                notes=[],
            )
        ]
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = ["gen_1", "gen_2"]
        service = _make_service(review_repo, batch_repo)
        result = await service.list_for_user_tasks(
            1, ["gen_1", "gen_2", "gen_forbidden"]
        )
        assert [r.synth_task_id for r in result] == ["gen_1", "gen_2"]
        assert result[0].status == "pending_review"
        assert result[1].status == "done"


class TestUserReviewServiceListProgress:
    @patch.object(SyntheticTaskService, "resolve_entry")
    async def test_resolves_original_entries_and_aggregates(
        self, mock_resolve
    ) -> None:
        from app.schemas.synthetic_review import SyntheticTaskRead

        def _read(task_id: str, original: str) -> SyntheticTaskRead:
            return SyntheticTaskRead(
                id=task_id,
                original_task_id=original,
                model_name="gpt-test",
                witness_passed=True,
                train=[],
                test=[],
            )

        mock_resolve.side_effect = lambda eid: (
            [_read("gen_a1", "d35bdbdc"), _read("gen_a2", "d35bdbdc")]
            if eid == "d35bdbdc"
            else [_read("gen_b1", "46c35fc7")]
        )

        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_by_user_and_tasks.return_value = [
            UserReview(
                id=1,
                user_id=1,
                synth_task_id="gen_a1",
                status="done",
                notes=[],
            ),
            UserReview(
                id=2,
                user_id=1,
                synth_task_id="gen_b1",
                status="needs_revision",
                notes=[],
            ),
        ]
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = [
            "d35bdbdc",
            "46c35fc7",
        ]
        service = _make_service(review_repo, batch_repo)
        result = await service.list_progress(
            1, ["d35bdbdc", "46c35fc7", "forbidden"]
        )
        assert [r.entry_id for r in result] == ["d35bdbdc", "46c35fc7"]
        assert result[0].total == 2
        assert result[0].done == 1
        assert result[0].pending == 1
        assert result[0].status == "pending_review"
        assert result[1].status == "needs_revision"

    @patch.object(SyntheticTaskService, "resolve_entry")
    async def test_marks_done_when_all_variants_done(self, mock_resolve) -> None:
        from app.schemas.synthetic_review import SyntheticTaskRead

        def _read(task_id: str, original: str) -> SyntheticTaskRead:
            return SyntheticTaskRead(
                id=task_id,
                original_task_id=original,
                model_name="gpt-test",
                witness_passed=True,
                train=[],
                test=[],
            )

        mock_resolve.return_value = [
            _read("gen_a1", "d35bdbdc"),
            _read("gen_a2", "d35bdbdc"),
        ]
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_by_user_and_tasks.return_value = [
            UserReview(
                id=1,
                user_id=1,
                synth_task_id="gen_a1",
                status="done",
                notes=[],
            ),
            UserReview(
                id=2,
                user_id=1,
                synth_task_id="gen_a2",
                status="done",
                notes=[],
            ),
        ]
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = ["d35bdbdc"]
        service = _make_service(review_repo, batch_repo)
        result = await service.list_progress(1, ["d35bdbdc"])
        assert result[0].status == "done"
        assert result[0].done == 2

    async def test_filters_to_allowed_entries(self) -> None:
        review_repo = AsyncMock(spec=UserReviewRepository)
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.get_user_review_task_ids.return_value = []
        service = _make_service(review_repo, batch_repo)
        result = await service.list_progress(1, ["d35bdbdc"])
        assert result == []
