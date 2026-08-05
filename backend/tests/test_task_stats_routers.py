from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.repositories.batch import BatchRepository
from app.routers.task_stats import get_batch_repo, get_service, router
from app.schemas.task_stats import (
    TaskReviewGroupAdmin,
    TaskReviewGroupListRead,
    TaskReviewGroupRead,
    TaskReviewGroupUser,
    TaskSolverAnonRead,
)
from app.services.task_stats import TaskStatsService


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=TaskStatsService)
    svc.get_task_solvers_anon.return_value = [
        TaskSolverAnonRead(hypothesis="patrón de colores")
    ]
    return svc


@pytest.fixture
def mock_batch_repo() -> AsyncMock:
    repo = AsyncMock(spec=BatchRepository)
    repo.get_user_review_task_ids.return_value = ["gen_1"]
    return repo


def _build_app(
    mock_service: AsyncMock, mock_batch_repo: AsyncMock, user_id: int = 1
) -> FastAPI:
    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=user_id, role="solver")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_batch_repo] = lambda: mock_batch_repo
    application.dependency_overrides[get_current_user] = mock_get_current_user
    return application


async def _get_solvers_public(app: FastAPI, task_id: str = "54dc2872"):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(f"/api/v1/tasks/{task_id}/solvers-public")


async def _get_my_hypothesis(app: FastAPI, task_id: str = "54dc2872"):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(f"/api/v1/tasks/{task_id}/my-hypothesis")


async def _put_my_hypothesis(
    app: FastAPI, task_id: str = "54dc2872", body: dict | None = None
):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.put(
            f"/api/v1/tasks/{task_id}/my-hypothesis",
            json=body or {"hypothesis": "regla revisada"},
        )


class TestTaskSolversPublic:
    async def test_returns_anonymized_solutions(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        svc.get_task_solvers_anon.return_value = [
            TaskSolverAnonRead(hypothesis="hipótesis anónima")
        ]
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = ["gen_1"]
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=True,
        ):
            response = await _get_solvers_public(_build_app(svc, repo))
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == [{"hypothesis": "hipótesis anónima"}]
        assert "email" not in data[0]
        assert "userId" not in data[0]
        svc.get_task_solvers_anon.assert_awaited_once_with(
            task_id="54dc2872", exclude_user_id=1
        )

    async def test_denied_without_review_access(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = []
        app = _build_app(
            AsyncMock(spec=TaskStatsService), repo
        )
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=False,
        ):
            response = await _get_solvers_public(app)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestMyHypothesis:
    async def test_get_returns_own_hypothesis(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        svc.get_my_hypothesis.return_value = "mi hipótesis"
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = ["gen_1"]
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=True,
        ):
            response = await _get_my_hypothesis(_build_app(svc, repo))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"hypothesis": "mi hipótesis"}
        svc.get_my_hypothesis.assert_awaited_once_with(
            task_id="54dc2872", user_id=1
        )

    async def test_get_returns_null_when_no_hypothesis(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        svc.get_my_hypothesis.return_value = None
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = ["gen_1"]
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=True,
        ):
            response = await _get_my_hypothesis(_build_app(svc, repo))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"hypothesis": None}

    async def test_get_denied_without_review_access(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = []
        app = _build_app(AsyncMock(spec=TaskStatsService), repo)
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=False,
        ):
            response = await _get_my_hypothesis(app)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_put_saves_hypothesis(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        svc.save_my_hypothesis.return_value = "regla revisada"
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = ["gen_1"]
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=True,
        ):
            response = await _put_my_hypothesis(_build_app(svc, repo))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"hypothesis": "regla revisada"}
        svc.save_my_hypothesis.assert_awaited_once_with(
            task_id="54dc2872", user_id=1, hypothesis="regla revisada"
        )

    async def test_put_denied_without_review_access(self) -> None:
        repo = AsyncMock(spec=BatchRepository)
        repo.get_user_review_task_ids.return_value = []
        app = _build_app(AsyncMock(spec=TaskStatsService), repo)
        with patch(
            "app.routers.task_stats.SyntheticTaskService.user_can_review_original",
            return_value=False,
        ):
            response = await _put_my_hypothesis(app)
        assert response.status_code == status.HTTP_403_FORBIDDEN


def _build_admin_app(mock_service: AsyncMock) -> FastAPI:
    async def mock_admin_user() -> CurrentUser:
        return CurrentUser(user_id=99, role="admin")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_current_user] = mock_admin_user
    return application


async def _get_review_groups(app: FastAPI):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get("/api/v1/tasks/review-groups")


class TestSearchReviewGroupsRouter:
    def _sample_list(self) -> TaskReviewGroupListRead:
        return TaskReviewGroupListRead(
            items=[
                TaskReviewGroupRead(
                    original_task_id="00576224",
                    datasets=["1_train"],
                    solvers=[],
                    solution_count=0,
                    width=5,
                    height=5,
                    same_size=True,
                    width_delta=0,
                    height_delta=0,
                    transform_label="same_size",
                    total_variants=1,
                    witness_passed_count=1,
                    witness_failed_count=0,
                    first_variant_id="gen_a",
                    user_review=TaskReviewGroupUser(
                        reviewed_variants=1,
                        variants_with_incorrect_mark=1,
                        incorrect_marks=1,
                        reviewer_emails=["a@x.com"],
                    ),
                    admin_review=TaskReviewGroupAdmin(
                        status="done", reviewed_variants=1
                    ),
                )
            ],
            total=1,
            page=1,
            per_page=100,
            total_pages=1,
        )

    async def test_admin_can_search_review_groups(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        svc.search_review_groups.return_value = self._sample_list()
        response = await _get_review_groups(_build_admin_app(svc))
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["total"] == 1
        item = body["items"][0]
        assert item["originalTaskId"] == "00576224"
        assert item["userReview"]["variantsWithIncorrectMark"] == 1
        assert item["userReview"]["reviewerEmails"] == ["a@x.com"]
        assert item["adminReview"]["status"] == "done"
        svc.search_review_groups.assert_awaited_once()
        call_kwargs = svc.search_review_groups.call_args.kwargs
        assert call_kwargs["admin_user_id"] == 99

    async def test_denies_non_admin(self) -> None:
        svc = AsyncMock(spec=TaskStatsService)
        async def mock_solver_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="solver")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)
        application.dependency_overrides[get_service] = lambda: svc
        application.dependency_overrides[get_current_user] = mock_solver_user
        response = await _get_review_groups(application)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        svc.search_review_groups.assert_not_awaited()
