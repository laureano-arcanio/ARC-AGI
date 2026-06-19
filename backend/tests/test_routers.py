from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient

from app.errors import (
    ObjectNotFoundError,
    global_exception_handler,
    object_not_found_handler,
)
from app.routers.example_table import get_service, router
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.services.example_table import ExampleTableService


@pytest.fixture
def app(mock_service: AsyncMock) -> FastAPI:
    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    return application


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=ExampleTableService)
    svc.get_all.return_value = []
    svc.get_by_id.side_effect = ObjectNotFoundError("ExampleTable", 0)
    svc.create.return_value = ExampleTableRead(
        id=1, name="created", description="created entry"
    )
    svc.update.side_effect = ObjectNotFoundError("ExampleTable", 0)
    svc.delete.side_effect = ObjectNotFoundError("ExampleTable", 0)
    return svc


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestExampleTableRouterGetAll:
    async def test_returns_empty_list(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/example-tables/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    async def test_returns_list(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.get_all.return_value = [
            ExampleTableRead(id=1, name="a"),
            ExampleTableRead(id=2, name="b"),
        ]
        response = await client.get("/api/v1/example-tables/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "a"


class TestExampleTableRouterGetById:
    async def test_returns_instance(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.get_by_id.side_effect = None
        mock_service.get_by_id.return_value = ExampleTableRead(
            id=5, name="by-id", description="found"
        )
        response = await client.get("/api/v1/example-tables/5")
        assert response.status_code == 200
        assert response.json()["name"] == "by-id"

    async def test_returns_404_when_not_found(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/example-tables/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestExampleTableRouterCreate:
    async def test_creates_and_returns_201(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.post(
            "/api/v1/example-tables/",
            json={"name": "new-item", "description": "an item"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == "created"
        mock_service.create.assert_awaited_once()
        args = mock_service.create.await_args[0][0]
        assert isinstance(args, ExampleTableCreate)
        assert args.name == "new-item"

    async def test_returns_422_on_missing_name(
        self, client: AsyncClient
    ) -> None:
        response = await client.post(
            "/api/v1/example-tables/",
            json={"description": "missing name"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestExampleTableRouterUpdate:
    async def test_updates_and_returns_200(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.update.side_effect = None
        mock_service.update.return_value = ExampleTableRead(
            id=1, name="updated", description="updated entry"
        )
        response = await client.put(
            "/api/v1/example-tables/1", json={"name": "new-name"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "updated"
        mock_service.update.assert_awaited_once()
        args = mock_service.update.await_args[0]
        assert args[0] == 1
        assert isinstance(args[1], ExampleTableUpdate)

    async def test_returns_404_when_not_found(self, client: AsyncClient) -> None:
        response = await client.put(
            "/api/v1/example-tables/999", json={"name": "nope"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestExampleTableRouterDelete:
    async def test_deletes_and_returns_204(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.delete.side_effect = None
        mock_service.delete.return_value = None
        response = await client.delete("/api/v1/example-tables/1")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_service.delete.assert_awaited_with(1)

    async def test_returns_404_when_not_found(self, client: AsyncClient) -> None:
        response = await client.delete("/api/v1/example-tables/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
