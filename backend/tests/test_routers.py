from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient

from app.errors import (
    InvalidCredentialsError,
    ObjectNotFoundError,
    global_exception_handler,
    invalid_credentials_handler,
    object_not_found_handler,
)
from app.routers.example_table import get_service, router
from app.schemas.attempt import AttemptRead
from app.schemas.event import EventRead
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.schemas.user import LoginResponse, UserRead
from app.services.example_table import ExampleTableService


@pytest.fixture
def app(mock_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user, require_admin

    async def mock_admin() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_current_user] = mock_admin
    application.dependency_overrides[require_admin] = mock_admin
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
    from app.dependencies.auth import CurrentUser, get_current_user, require_admin
    from app.routers.user import get_service, router

    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    async def mock_require_admin() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(InvalidCredentialsError)(invalid_credentials_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: user_mock_service
    application.dependency_overrides[get_current_user] = mock_get_current_user
    application.dependency_overrides[require_admin] = mock_require_admin
    return application


@pytest.fixture
def user_mock_service() -> AsyncMock:
    from app.services.user import UserService

    svc = AsyncMock(spec=UserService)
    svc.get_by_id.side_effect = ObjectNotFoundError("User", 0)
    svc.authenticate.side_effect = InvalidCredentialsError()
    svc.create.return_value = UserRead(id=1, email="created@test.com", role="solver")
    svc.change_password.side_effect = ObjectNotFoundError("User", 0)
    return svc


@pytest.fixture
async def user_client(user_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=user_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def unauth_user_app(user_mock_service: AsyncMock) -> FastAPI:
    from app.routers.user import get_service, router

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(InvalidCredentialsError)(invalid_credentials_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: user_mock_service
    return application


@pytest.fixture
async def unauth_user_client(unauth_user_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=unauth_user_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestUserRouterCreate:
    async def test_creates_and_returns_201(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        response = await user_client.post(
            "/api/v1/users/",
            json={"email": "new@test.com", "password": "secret123"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["id"] == 1
        assert response.json()["email"] == "created@test.com"
        assert response.json()["role"] == "solver"
        user_mock_service.create.assert_awaited_once()

    async def test_returns_422_on_missing_email(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.post(
            "/api/v1/users/",
            json={"password": "secret123"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_returns_403_when_not_admin(
        self, unauth_user_client: AsyncClient
    ) -> None:
        response = await unauth_user_client.post(
            "/api/v1/users/",
            json={"email": "new@test.com", "password": "secret123"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUserRouterLogin:
    async def test_returns_instance(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        user_mock_service.authenticate.side_effect = None
        user_mock_service.authenticate.return_value = LoginResponse(
            access_token="test-token",
            user=UserRead(id=5, email="login@test.com", role="solver"),
        )
        response = await user_client.post(
            "/api/v1/users/login",
            json={"email": "login@test.com", "password": "secret123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["accessToken"] == "test-token"
        assert data["tokenType"] == "bearer"
        assert data["user"]["id"] == 5
        assert data["user"]["email"] == "login@test.com"
        user_mock_service.authenticate.assert_awaited_with(
            "login@test.com", "secret123"
        )

    async def test_returns_401_when_invalid(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.post(
            "/api/v1/users/login",
            json={"email": "bad@test.com", "password": "wrong"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUserRouterChangePassword:
    async def test_returns_200(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        user_mock_service.change_password.side_effect = None
        user_mock_service.change_password.return_value = UserRead(
            id=5, email="user5@test.com", role="solver"
        )
        response = await user_client.put(
            "/api/v1/users/5/password",
            json={"password": "new-secret"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == 5
        user_mock_service.change_password.assert_awaited_with(
            5, user_mock_service.change_password.await_args[0][1]
        )

    async def test_returns_404_when_not_found(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.put(
            "/api/v1/users/999/password",
            json={"password": "new-secret"},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_returns_403_when_not_admin(
        self, unauth_user_client: AsyncClient
    ) -> None:
        response = await unauth_user_client.put(
            "/api/v1/users/5/password",
            json={"password": "new-secret"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_returns_422_on_missing_password(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.put(
            "/api/v1/users/5/password",
            json={},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestUserRouterGetById:
    async def test_returns_instance(
        self, user_client: AsyncClient, user_mock_service: AsyncMock
    ) -> None:
        user_mock_service.get_by_id.side_effect = None
        user_mock_service.get_by_id.return_value = UserRead(
            id=5, email="user5@test.com", role="solver"
        )
        response = await user_client.get("/api/v1/users/5")
        assert response.status_code == 200
        assert response.json()["id"] == 5
        assert response.json()["email"] == "user5@test.com"

    async def test_returns_404_when_not_found(
        self, user_client: AsyncClient
    ) -> None:
        response = await user_client.get("/api/v1/users/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---- Event Router Tests ----


@pytest.fixture
def event_batch_mock() -> AsyncMock:
    from app.repositories.batch import BatchRepository

    repo = AsyncMock(spec=BatchRepository)
    repo.user_has_access.return_value = True
    return repo


@pytest.fixture
def event_app(event_mock_service: AsyncMock, event_batch_mock: AsyncMock) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user
    from app.routers.event import get_batch_repo, get_service, router

    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: event_mock_service
    application.dependency_overrides[get_batch_repo] = lambda: event_batch_mock
    application.dependency_overrides[get_current_user] = mock_get_current_user
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
            "trigger": {"kind": "mechanical", "action": "cell_paint"},
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
            1, "abc", attempt_id=None
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

    async def test_filters_by_attempt_id(
        self, event_client: AsyncClient, event_mock_service: AsyncMock
    ) -> None:
        event_mock_service.get_events_by_user_and_task.return_value = []
        response = await event_client.get(
            "/api/v1/events/users/1/tasks/abc?attemptId=1"
        )
        assert response.status_code == 200
        assert response.json() == []
        event_mock_service.get_events_by_user_and_task.assert_awaited_with(
            1, "abc", attempt_id=1
        )


# ---- Attempt Router Tests ----


@pytest.fixture
def attempt_app(
    attempt_mock_service: AsyncMock, event_batch_mock: AsyncMock
) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user
    from app.routers.attempt import get_batch_repo, get_service, router

    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: attempt_mock_service
    application.dependency_overrides[get_batch_repo] = lambda: event_batch_mock
    application.dependency_overrides[get_current_user] = mock_get_current_user
    return application


@pytest.fixture
def attempt_mock_service() -> AsyncMock:
    from app.services.attempt import AttemptService

    svc = AsyncMock(spec=AttemptService)
    svc.create.return_value = AttemptRead(id=1, user_id=1, task_id="00576224")
    svc.get_by_user_and_task.return_value = []
    return svc


@pytest.fixture
async def attempt_client(attempt_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=attempt_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestAttemptRouterCreate:
    async def test_creates_and_returns_201(
        self, attempt_client: AsyncClient, attempt_mock_service: AsyncMock
    ) -> None:
        payload = {"userId": 1, "taskId": "00576224"}
        response = await attempt_client.post("/api/v1/attempts/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["id"] == 1
        assert response.json()["userId"] == 1
        assert response.json()["taskId"] == "00576224"
        attempt_mock_service.create.assert_awaited_once()

    async def test_returns_422_on_missing_required(
        self, attempt_client: AsyncClient
    ) -> None:
        response = await attempt_client.post("/api/v1/attempts/", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestAttemptRouterGetByUserAndTask:
    async def test_returns_empty_list(
        self, attempt_client: AsyncClient, attempt_mock_service: AsyncMock
    ) -> None:
        response = await attempt_client.get(
            "/api/v1/attempts/users/1/tasks/abc"
        )
        assert response.status_code == 200
        assert response.json() == []
        attempt_mock_service.get_by_user_and_task.assert_awaited_with(1, "abc")

    async def test_returns_list(
        self, attempt_client: AsyncClient, attempt_mock_service: AsyncMock
    ) -> None:
        attempt_mock_service.get_by_user_and_task.return_value = [
            AttemptRead(id=2, user_id=1, task_id="abc"),
            AttemptRead(id=1, user_id=1, task_id="abc"),
        ]
        response = await attempt_client.get(
            "/api/v1/attempts/users/1/tasks/abc"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == 2


# ---- Activity Router Tests ----


@pytest.fixture
def activity_mock_service() -> AsyncMock:
    from app.schemas.activity import ActivityStats, EventTypeSummary, TimelineBucket
    from app.services.activity import ActivityService

    svc = AsyncMock(spec=ActivityService)
    svc.get_stats.return_value = ActivityStats(
        timeline=[TimelineBucket(bucket="2024-01-01T10:00:00", count=5)],
        last_event_timestamp=1704067200000,
        active_users=3,
        event_type_summary=[EventTypeSummary(type="cell_paint", count=5)],
        total_events=5,
    )
    return svc


@pytest.fixture
def activity_app(activity_mock_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user, require_admin
    from app.routers.activity import get_service, router

    async def mock_admin() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    async def mock_require_admin() -> CurrentUser:
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: activity_mock_service
    application.dependency_overrides[get_current_user] = mock_admin
    application.dependency_overrides[require_admin] = mock_require_admin
    return application


@pytest.fixture
def activity_unauth_app(activity_mock_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user, require_admin
    from app.routers.activity import get_service, router

    async def mock_solver() -> CurrentUser:
        return CurrentUser(user_id=2, role="solver")

    async def mock_require_admin_fail() -> None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    application = FastAPI()
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: activity_mock_service
    application.dependency_overrides[get_current_user] = mock_solver
    application.dependency_overrides[require_admin] = mock_require_admin_fail
    return application


@pytest.fixture
async def activity_client(activity_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=activity_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def activity_unauth_client(
    activity_unauth_app: FastAPI,
) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=activity_unauth_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestActivityRouterGetStats:
    async def test_returns_stats(
        self, activity_client: AsyncClient, activity_mock_service: AsyncMock
    ) -> None:
        response = await activity_client.get("/api/v1/activity")
        assert response.status_code == 200
        data = response.json()
        assert len(data["timeline"]) == 1
        assert data["lastEventTimestamp"] == 1704067200000
        assert data["activeUsers"] == 3
        assert data["totalEvents"] == 5
        activity_mock_service.get_stats.assert_awaited_once_with(event_types=None)

    async def test_filters_by_event_types(
        self, activity_client: AsyncClient, activity_mock_service: AsyncMock
    ) -> None:
        response = await activity_client.get(
            "/api/v1/activity?eventTypes=cell_paint,submit"
        )
        assert response.status_code == 200
        activity_mock_service.get_stats.assert_awaited_with(
            event_types=["cell_paint", "submit"]
        )

    async def test_returns_403_for_non_admin(
        self, activity_unauth_client: AsyncClient
    ) -> None:
        response = await activity_unauth_client.get("/api/v1/activity")
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---- Example Table Auth Tests ----


@pytest.fixture
def example_table_unauth_app(mock_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import CurrentUser, get_current_user, require_admin

    async def mock_solver() -> CurrentUser:
        return CurrentUser(user_id=2, role="solver")

    async def mock_require_admin_fail() -> CurrentUser:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_current_user] = mock_solver
    application.dependency_overrides[require_admin] = mock_require_admin_fail
    return application


@pytest.fixture
async def unauth_client(
    example_table_unauth_app: FastAPI,
) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport

    transport = ASGITransport(app=example_table_unauth_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestExampleTableRouterAuth:
    async def test_get_all_returns_403_for_non_admin(
        self, unauth_client: AsyncClient
    ) -> None:
        response = await unauth_client.get("/api/v1/example-tables/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_get_by_id_returns_403_for_non_admin(
        self, unauth_client: AsyncClient
    ) -> None:
        response = await unauth_client.get("/api/v1/example-tables/1")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_create_returns_403_for_non_admin(
        self, unauth_client: AsyncClient
    ) -> None:
        response = await unauth_client.post(
            "/api/v1/example-tables/", json={"name": "test"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_update_returns_403_for_non_admin(
        self, unauth_client: AsyncClient
    ) -> None:
        response = await unauth_client.put(
            "/api/v1/example-tables/1", json={"name": "test"}
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_delete_returns_403_for_non_admin(
        self, unauth_client: AsyncClient
    ) -> None:
        response = await unauth_client.delete("/api/v1/example-tables/1")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_returns_403_without_token(
        self, mock_service: AsyncMock
    ) -> None:
        from httpx import ASGITransport

        app_no_auth = FastAPI()
        app_no_auth.exception_handler(ObjectNotFoundError)(object_not_found_handler)
        app_no_auth.exception_handler(Exception)(global_exception_handler)
        app_no_auth.include_router(router)
        app_no_auth.dependency_overrides[get_service] = lambda: mock_service
        transport = ASGITransport(app=app_no_auth)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/example-tables/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
