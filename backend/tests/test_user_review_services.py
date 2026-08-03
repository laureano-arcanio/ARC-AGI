from unittest.mock import AsyncMock, patch

import pytest

from app.errors import ObjectNotFoundError
from app.models.user import User
from app.models.user_review import UserReview
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.user import UserRepository
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


def _make_full_service(
    review_repo: AsyncMock,
    batch_repo: AsyncMock,
    user_repo: AsyncMock,
    event_repo: AsyncMock,
) -> UserReviewService:
    return UserReviewService(
        repository=review_repo,
        batch_repository=batch_repo,
        user_repository=user_repo,
        event_repository=event_repo,
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
    @patch.object(SyntheticTaskService, "resolve_entry_ids")
    async def test_resolves_original_entries_and_aggregates(
        self, mock_resolve
    ) -> None:
        mock_resolve.return_value = {
            "d35bdbdc": ["gen_a1", "gen_a2"],
            "46c35fc7": ["gen_b1"],
        }

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

    @patch.object(SyntheticTaskService, "resolve_entry_ids")
    async def test_marks_done_when_all_variants_done(self, mock_resolve) -> None:
        mock_resolve.return_value = {
            "d35bdbdc": ["gen_a1", "gen_a2"],
        }
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


class TestUserReviewServiceGetSolverReviewDetails:
    @patch.object(SyntheticTaskService, "resolve_entry")
    async def test_groups_reviews_by_user(self, mock_resolve) -> None:
        from app.schemas.synthetic_review import SyntheticTaskRead

        mock_resolve.return_value = [
            SyntheticTaskRead(
                id="gen_a1",
                original_task_id="d35bdbdc",
                model_name="gpt-test",
                witness_passed=True,
                train=[],
                test=[],
            ),
            SyntheticTaskRead(
                id="gen_a2",
                original_task_id="d35bdbdc",
                model_name="gpt-test",
                witness_passed=True,
                train=[],
                test=[],
            ),
        ]
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_reviews_by_tasks.return_value = [
            UserReview(
                id=1,
                user_id=7,
                synth_task_id="gen_a1",
                status="done",
                correct=False,
                notes=["incorrecta"],
            ),
            UserReview(
                id=2,
                user_id=7,
                synth_task_id="gen_a2",
                status="pending_review",
                notes=[],
            ),
        ]
        batch_repo = AsyncMock(spec=BatchRepository)
        user_repo = AsyncMock(spec=UserRepository)
        user_repo.get_by_ids.return_value = [User(id=7, email="a@b.com")]
        event_repo = AsyncMock(spec=EventRepository)
        event_repo.get_hypothesis_texts_by_task.return_value = {
            7: ["hip original", "hip revisada"]
        }
        service = _make_full_service(review_repo, batch_repo, user_repo, event_repo)

        result = await service.get_solver_review_details("d35bdbdc")
        assert len(result) == 1
        assert result[0].user_id == 7
        assert result[0].email == "a@b.com"
        assert result[0].original_hypothesis == "hip original"
        assert result[0].revised_hypothesis == "hip revisada"
        assert [v.synth_task_id for v in result[0].variants] == [
            "gen_a1",
            "gen_a2",
        ]
        assert result[0].variants[0].correct is False
        assert result[0].variants[0].notes == ["incorrecta"]
        review_repo.get_reviews_by_tasks.assert_awaited_once_with(
            ["gen_a1", "gen_a2"]
        )
        event_repo.get_hypothesis_texts_by_task.assert_awaited_once_with(
            "d35bdbdc"
        )

    @patch.object(SyntheticTaskService, "resolve_entry")
    async def test_returns_empty_when_no_variants(self, mock_resolve) -> None:
        mock_resolve.return_value = []
        review_repo = AsyncMock(spec=UserReviewRepository)
        batch_repo = AsyncMock(spec=BatchRepository)
        service = _make_service(review_repo, batch_repo)
        result = await service.get_solver_review_details("d35bdbdc")
        assert result == []
        review_repo.get_reviews_by_tasks.assert_not_awaited()

    @patch.object(SyntheticTaskService, "resolve_entry")
    async def test_handles_missing_repos_gracefully(self, mock_resolve) -> None:
        from app.schemas.synthetic_review import SyntheticTaskRead

        mock_resolve.return_value = [
            SyntheticTaskRead(
                id="gen_a1",
                original_task_id="d35bdbdc",
                model_name="gpt-test",
                witness_passed=True,
                train=[],
                test=[],
            )
        ]
        review_repo = AsyncMock(spec=UserReviewRepository)
        review_repo.get_reviews_by_tasks.return_value = [
            UserReview(
                id=1,
                user_id=7,
                synth_task_id="gen_a1",
                status="done",
                notes=[],
            )
        ]
        batch_repo = AsyncMock(spec=BatchRepository)
        service = _make_service(review_repo, batch_repo)
        result = await service.get_solver_review_details("d35bdbdc")
        assert len(result) == 1
        assert result[0].email == ""
        assert result[0].original_hypothesis is None
        assert result[0].revised_hypothesis is None
