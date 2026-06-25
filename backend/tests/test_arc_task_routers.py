from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.repositories.batch import BatchRepository
from app.repositories.review import PeerReviewPairRepository
from app.routers.arc_task import (
    get_batch_repo,
    get_pair_repo,
    get_service,
    router,
)
from app.schemas.arc_task import ArcTaskPair, ArcTaskRead
from app.services.arc_task import ArcTaskService


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=ArcTaskService)
    svc.get_random_tasks_from_ids.return_value = [
        ArcTaskRead(
            id="t1",
            train=[ArcTaskPair(input=[[1]], output=[[2]])],
            test=[ArcTaskPair(input=[[3]], output=[[4]])],
        ),
        ArcTaskRead(
            id="t2",
            train=[ArcTaskPair(input=[[5]], output=[[6]])],
            test=[ArcTaskPair(input=[[7]], output=[[8]])],
        ),
    ]
    return svc


@pytest.fixture
def mock_batch_repo() -> AsyncMock:
    repo = AsyncMock(spec=BatchRepository)
    repo.get_accessible_task_ids.return_value = ["t1", "t2"]
    return repo


@pytest.fixture
def app(
    mock_service: AsyncMock, mock_batch_repo: AsyncMock
) -> FastAPI:

    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="solver")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_batch_repo] = lambda: mock_batch_repo
    application.dependency_overrides[get_current_user] = mock_get_current_user
    return application


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestArcTaskRouterGetRandom:
    async def test_returns_tasks_with_default_count(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.get("/api/v1/arc-tasks/random")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "t1"
        assert data[0]["test"][0]["output"] == [[4]]
        mock_service.get_random_tasks_from_ids.assert_awaited_once()
        assert mock_service.get_random_tasks_from_ids.await_args.kwargs["count"] == 10

    async def test_passes_count_query_param(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        await client.get("/api/v1/arc-tasks/random?count=5")
        assert mock_service.get_random_tasks_from_ids.await_args.kwargs["count"] == 5

    async def test_rejects_count_below_one(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/arc-tasks/random?count=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_rejects_count_above_max(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/arc-tasks/random?count=101")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_returns_empty_list_when_no_accessible_tasks(
        self, client: AsyncClient, mock_batch_repo: AsyncMock
    ) -> None:
        mock_batch_repo.get_accessible_task_ids.return_value = []
        response = await client.get("/api/v1/arc-tasks/random")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    async def test_returns_401_without_token(
        self, mock_service: AsyncMock, mock_batch_repo: AsyncMock
    ) -> None:
        app_no_auth = FastAPI()
        app_no_auth.exception_handler(Exception)(global_exception_handler)
        app_no_auth.include_router(router)
        app_no_auth.dependency_overrides[get_service] = lambda: mock_service
        app_no_auth.dependency_overrides[get_batch_repo] = lambda: mock_batch_repo
        transport = ASGITransport(app=app_no_auth)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/arc-tasks/random")
        assert response.status_code == status.HTTP_403_FORBIDDEN


def _full_task() -> ArcTaskRead:
    return ArcTaskRead(
        id="t1",
        train=[ArcTaskPair(input=[[1]], output=[[2]])],
        test=[ArcTaskPair(input=[[3]], output=[[4]])],
    )


def _build_get_task_app(
    *,
    role: str,
    has_access: bool,
    paired_ids: list[int],
    paired_has_access: bool,
) -> tuple[FastAPI, AsyncMock]:
    svc = AsyncMock(spec=ArcTaskService)

    async def get_by_id(_task_id: str, include_test_outputs: bool = True):
        task = _full_task()
        if include_test_outputs:
            return task
        return ArcTaskRead(
            id=task.id,
            train=task.train,
            test=[ArcTaskPair(input=p.input, output=[]) for p in task.test],
        )

    svc.get_by_id.side_effect = get_by_id

    batch_repo = AsyncMock(spec=BatchRepository)

    async def user_has_access(user_id: int, _task_id: str) -> bool:
        if user_id == 1:
            return has_access
        return paired_has_access

    batch_repo.user_has_access.side_effect = user_has_access

    pair_repo = AsyncMock(spec=PeerReviewPairRepository)
    pair_repo.get_paired_solver_ids.return_value = paired_ids

    async def current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role=role)

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: svc
    application.dependency_overrides[get_batch_repo] = lambda: batch_repo
    application.dependency_overrides[get_pair_repo] = lambda: pair_repo
    application.dependency_overrides[get_current_user] = current_user
    return application, svc


async def _get_task(app: FastAPI):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get("/api/v1/arc-tasks/t1")


class TestArcTaskRouterGetTask:
    async def test_assigned_solver_allowed_without_outputs(self) -> None:
        app, _ = _build_get_task_app(
            role="solver",
            has_access=True,
            paired_ids=[],
            paired_has_access=False,
        )
        response = await _get_task(app)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["test"][0]["output"] == []

    async def test_unrelated_solver_denied(self) -> None:
        app, _ = _build_get_task_app(
            role="solver",
            has_access=False,
            paired_ids=[],
            paired_has_access=False,
        )
        response = await _get_task(app)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_paired_reviewer_allowed_without_outputs(self) -> None:
        app, _ = _build_get_task_app(
            role="solver",
            has_access=False,
            paired_ids=[2],
            paired_has_access=True,
        )
        response = await _get_task(app)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["test"][0]["output"] == []

    async def test_admin_receives_outputs(self) -> None:
        app, _ = _build_get_task_app(
            role="admin",
            has_access=False,
            paired_ids=[],
            paired_has_access=False,
        )
        response = await _get_task(app)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["test"][0]["output"] == [[4]]
