from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.repositories.batch import BatchRepository
from app.routers.task_stats import get_batch_repo, get_service, router
from app.schemas.task_stats import TaskSolverAnonRead
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
