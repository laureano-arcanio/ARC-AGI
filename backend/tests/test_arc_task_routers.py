from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.errors import global_exception_handler
from app.routers.arc_task import get_service, router
from app.schemas.arc_task import ArcTaskPair, ArcTaskRead
from app.services.arc_task import ArcTaskService


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=ArcTaskService)
    svc.get_random_tasks.return_value = [
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
def app(mock_service: AsyncMock) -> FastAPI:
    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
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
        mock_service.get_random_tasks.assert_awaited_once()
        assert mock_service.get_random_tasks.await_args.kwargs["count"] == 10

    async def test_passes_count_query_param(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        await client.get("/api/v1/arc-tasks/random?count=5")
        assert mock_service.get_random_tasks.await_args.kwargs["count"] == 5

    async def test_rejects_count_below_one(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/arc-tasks/random?count=0")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_rejects_count_above_max(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/arc-tasks/random?count=101")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_returns_empty_list_when_service_has_no_tasks(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.get_random_tasks.return_value = []
        response = await client.get("/api/v1/arc-tasks/random")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
