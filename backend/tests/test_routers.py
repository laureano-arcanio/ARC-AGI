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
from app.schemas.event import EventRead
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.schemas.user import UserRead
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


# ---- User Router Tests ----


@pytest.fixture
def user_app(user_mock_service: AsyncMock) -> FastAPI:
    from app.routers.user import get_service, router

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: user_mock_service
    return application


@pytest.fixture
def user_mock_service() -> AsyncMock:
    from app.services.user import UserService

    svc = AsyncMock(spec=UserService)
    svc.get_by_id.side_effect = ObjectNotFoundError("User", 0)
    svc.get_by_uuid.side_effect = ObjectNotFoundError("User", "unknown")
    svc.create.return_value = UserRead(id=1, uuid="generated-uuid", role="solver")
    return svc


@pytest.fixture
async def user_client(user_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=user_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestUserRouterCreate:
    async def test_creates_and_returns_201(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        response = await user_client.post("/api/v1/users/", json={})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["id"] == 1
        assert response.json()["uuid"] == "generated-uuid"
        assert response.json()["role"] == "solver"
        user_mock_service.create.assert_awaited_once()


class TestUserRouterGetByUuid:
    async def test_returns_instance(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        user_mock_service.get_by_uuid.side_effect = None
        user_mock_service.get_by_uuid.return_value = UserRead(
            id=5, uuid="abc-123", role="solver"
        )
        response = await user_client.get("/api/v1/users/by-uuid/abc-123")
        assert response.status_code == 200
        assert response.json()["id"] == 5
        assert response.json()["uuid"] == "abc-123"
        user_mock_service.get_by_uuid.assert_awaited_with("abc-123")

    async def test_returns_404_when_not_found(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.get("/api/v1/users/by-uuid/nonexistent")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUserRouterGetById:
    async def test_returns_instance(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        user_mock_service.get_by_id.side_effect = None
        user_mock_service.get_by_id.return_value = UserRead(
            id=5, uuid="abc-123", role="solver"
        )
        response = await user_client.get("/api/v1/users/5")
        assert response.status_code == 200
        assert response.json()["id"] == 5
        assert response.json()["uuid"] == "abc-123"

    async def test_returns_404_when_not_found(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.get("/api/v1/users/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---- Event Router Tests ----


@pytest.fixture
def event_app(event_mock_service: AsyncMock) -> FastAPI:
    from app.routers.event import get_service, router

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: event_mock_service
    return application


@pytest.fixture
def event_mock_service() -> AsyncMock:
    from app.services.event import EventService

    svc = AsyncMock(spec=EventService)
    svc.create.return_value = EventRead(
        id=1,
        user_id=1,
        task_id="abc",
        node_id="node_001",
        trigger={"kind": "mechanical"},
        state_snapshot=[[0]],
        timestamp=1,
    )
    svc.get_events_by_user_and_task.return_value = []
    return svc


@pytest.fixture
async def event_client(event_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=event_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestEventRouterCreate:
    async def test_creates_and_returns_201(
        self, event_client: AsyncClient, event_mock_service: AsyncMock
    ) -> None:
        payload = {
            "userId": 1,
            "taskId": "abc",
            "nodeId": "node_001",
            "trigger": {"kind": "mechanical", "action": "cell_click"},
            "stateSnapshot": [[0, 1, 0]],
            "timestamp": 1625000000000,
        }
        response = await event_client.post("/api/v1/events/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["nodeId"] == "node_001"
        event_mock_service.create.assert_awaited_once()

    async def test_returns_422_on_missing_required(
        self, event_client: AsyncClient
    ) -> None:
        response = await event_client.post("/api/v1/events/", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestEventRouterGetByUserAndTask:
    async def test_returns_empty_list(
        self, event_client: AsyncClient, event_mock_service: AsyncMock
    ) -> None:
        response = await event_client.get(
            "/api/v1/events/users/1/tasks/abc"
        )
        assert response.status_code == 200
        assert response.json() == []
        event_mock_service.get_events_by_user_and_task.assert_awaited_with(
            1, "abc"
        )

    async def test_returns_list(
        self, event_client: AsyncClient, event_mock_service: AsyncMock
    ) -> None:
        event_mock_service.get_events_by_user_and_task.return_value = [
            EventRead(
                id=1,
                user_id=1,
                task_id="abc",
                node_id="node_001",
                trigger={"kind": "mechanical"},
                state_snapshot=[[0]],
                timestamp=1,
            ),
        ]
        response = await event_client.get(
            "/api/v1/events/users/1/tasks/abc"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["nodeId"] == "node_001"
