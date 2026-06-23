from unittest.mock import AsyncMock

import pytest

from app.errors import (
    DuplicateEmailError,
    InvalidCredentialsError,
    ObjectNotFoundError,
)
from app.models.attempt import Attempt
from app.models.event import Event
from app.models.example_table import ExampleTable
from app.models.user import User, UserRole
from app.schemas.attempt import AttemptCreate, AttemptRead
from app.schemas.event import EventCreate, EventRead
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.schemas.user import (
    LoginResponse,
    UserCreate,
    UserPasswordUpdate,
    UserRead,
)
from app.services.attempt import AttemptService
from app.services.event import EventService
from app.services.example_table import ExampleTableService
from app.services.user import UserService, _hash_password


@pytest.fixture
def mock_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side_effect(data):
        return ExampleTable(id=1, **data)

    async def update_side_effect(id, data):
        return ExampleTable(id=id, **data)

    repo.get_all.return_value = []
    repo.get_by_id.side_effect = ObjectNotFoundError("ExampleTable", 0)
    repo.create.side_effect = create_side_effect
    repo.update.side_effect = update_side_effect
    repo.delete.return_value = None
    return repo


@pytest.fixture
def service(mock_repo: AsyncMock) -> ExampleTableService:
    svc = ExampleTableService(repository=mock_repo)
    svc.read_schema = ExampleTableRead
    return svc


class TestExampleTableServiceGetAll:
    async def test_returns_empty_list(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        result = await service.get_all()
        assert result == []
        mock_repo.get_all.assert_awaited_once()

    async def test_returns_list_of_schemas(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.get_all.return_value = [
            ExampleTable(id=1, name="a", description="aa"),
            ExampleTable(id=2, name="b", description="bb"),
        ]
        result = await service.get_all()
        assert len(result) == 2
        assert isinstance(result[0], ExampleTableRead)
        assert result[0].name == "a"
        assert result[1].description == "bb"


class TestExampleTableServiceGetById:
    async def test_returns_schema_when_found(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.get_by_id.side_effect = None
        mock_repo.get_by_id.return_value = ExampleTable(
            id=5, name="found", description="found it"
        )
        result = await service.get_by_id(5)
        assert isinstance(result, ExampleTableRead)
        assert result.id == 5
        assert result.name == "found"
        mock_repo.get_by_id.assert_awaited_with(5)

    async def test_raises_when_not_found(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.get_by_id.side_effect = ObjectNotFoundError("ExampleTable", 999)
        with pytest.raises(ObjectNotFoundError):
            await service.get_by_id(999)


class TestExampleTableServiceCreate:
    async def test_creates_and_returns_schema(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        create_data = ExampleTableCreate(name="new", description="new entry")
        result = await service.create(create_data)
        assert isinstance(result, ExampleTableRead)
        assert result.name == "new"
        mock_repo.create.assert_awaited_with(
            {"name": "new", "description": "new entry"}
        )


class TestExampleTableServiceUpdate:
    async def test_updates_and_returns_schema(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.update.return_value = ExampleTable(
            id=1, name="updated", description="changed"
        )
        update_data = ExampleTableUpdate(name="updated")
        result = await service.update(1, update_data)
        assert isinstance(result, ExampleTableRead)
        assert result.name == "updated"
        mock_repo.update.assert_awaited_with(
            1, {"name": "updated"}
        )

    async def test_raises_when_not_found(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.update.side_effect = ObjectNotFoundError("ExampleTable", 999)
        with pytest.raises(ObjectNotFoundError):
            await service.update(999, ExampleTableUpdate(name="nope"))


class TestExampleTableServiceDelete:
    async def test_deletes(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        await service.delete(1)
        mock_repo.delete.assert_awaited_with(1)

    async def test_raises_when_not_found(
        self, service: ExampleTableService, mock_repo: AsyncMock
    ) -> None:
        mock_repo.delete.side_effect = ObjectNotFoundError("ExampleTable", 999)
        with pytest.raises(ObjectNotFoundError):
            await service.delete(999)


@pytest.fixture
def user_mock_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side_effect(data):
        return User(
            id=1,
            email=data.get("email", "user@test.com"),
            password_hash=data.get("password_hash", "hash"),
            role=data.get("role", UserRole.SOLVER),
        )

    async def update_side_effect(user_id, data):
        return User(
            id=user_id,
            email=f"user{user_id}@test.com",
            password_hash=data.get("password_hash", "hash"),
            role=UserRole.SOLVER,
        )

    repo.create.side_effect = create_side_effect
    repo.update.side_effect = update_side_effect
    repo.get_by_id.side_effect = ObjectNotFoundError("User", 0)
    repo.get_by_email.side_effect = ObjectNotFoundError("User", "unknown@test.com")
    return repo


@pytest.fixture
def user_service(user_mock_repo: AsyncMock) -> UserService:
    svc = UserService(repository=user_mock_repo)
    svc.read_schema = UserRead
    return svc


class TestUserServiceCreate:
    async def test_creates_and_returns_schema(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        result = await user_service.create(
            UserCreate(email="user@test.com", password="secret123")
        )
        assert isinstance(result, UserRead)
        assert result.id == 1
        assert result.email == "user@test.com"
        user_mock_repo.create.assert_awaited_once()
        call_args = user_mock_repo.create.await_args[0][0]
        assert call_args["email"] == "user@test.com"
        assert "password_hash" in call_args
        assert call_args["password_hash"] != "secret123"

    async def test_raises_when_duplicate_email(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        user_mock_repo.get_by_email.side_effect = None
        user_mock_repo.get_by_email.return_value = User(
            id=1,
            email="existing@test.com",
            password_hash="hashed",
            role=UserRole.SOLVER,
        )
        with pytest.raises(DuplicateEmailError):
            await user_service.create(
                UserCreate(email="existing@test.com", password="secret123")
            )
        user_mock_repo.create.assert_not_awaited()


class TestUserServiceGetById:
    async def test_returns_schema_when_found(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        user_mock_repo.get_by_id.side_effect = None
        user_mock_repo.get_by_id.return_value = User(
            id=3, email="user3@test.com", password_hash="hashed", role=UserRole.SOLVER
        )
        result = await user_service.get_by_id(3)
        assert isinstance(result, UserRead)
        assert result.id == 3
        assert result.email == "user3@test.com"
        assert result.role == "solver"

    async def test_raises_when_not_found(
        self, user_service: UserService
    ) -> None:
        with pytest.raises(ObjectNotFoundError):
            await user_service.get_by_id(999)


class TestUserServiceAuthenticate:
    async def test_returns_schema_when_valid(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        hashed = _hash_password("secret123")
        user_mock_repo.get_by_email.side_effect = None
        user_mock_repo.get_by_email.return_value = User(
            id=7, email="auth@test.com", password_hash=hashed, role=UserRole.SOLVER
        )
        result = await user_service.authenticate("auth@test.com", "secret123")
        assert isinstance(result, LoginResponse)
        assert result.access_token
        assert result.token_type == "bearer"
        assert result.user.id == 7
        assert result.user.email == "auth@test.com"
        user_mock_repo.get_by_email.assert_awaited_with("auth@test.com")

    async def test_raises_when_not_found(
        self, user_service: UserService
    ) -> None:
        with pytest.raises(InvalidCredentialsError):
            await user_service.authenticate("nonexistent@test.com", "password")

    async def test_raises_when_wrong_password(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        hashed = _hash_password("secret123")
        user_mock_repo.get_by_email.side_effect = None
        user_mock_repo.get_by_email.return_value = User(
            id=8, email="auth@test.com", password_hash=hashed, role=UserRole.SOLVER
        )
        with pytest.raises(InvalidCredentialsError):
            await user_service.authenticate("auth@test.com", "wrongpass")


class TestUserServiceChangePassword:
    async def test_changes_and_returns_schema(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        result = await user_service.change_password(
            1, UserPasswordUpdate(password="new-secret")
        )
        assert isinstance(result, UserRead)
        assert result.id == 1
        user_mock_repo.update.assert_awaited_once()
        call_args = user_mock_repo.update.await_args[0][1]
        assert "password_hash" in call_args
        assert call_args["password_hash"] != "new-secret"

    async def test_raises_when_not_found(
        self, user_service: UserService, user_mock_repo: AsyncMock
    ) -> None:
        user_mock_repo.update.side_effect = ObjectNotFoundError("User", 999)
        with pytest.raises(ObjectNotFoundError):
            await user_service.change_password(
                999, UserPasswordUpdate(password="new-secret")
            )


@pytest.fixture
def event_mock_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side_effect(data):
        return Event(id=1, **data)

    repo.create.side_effect = create_side_effect
    repo.get_by_user_and_task.return_value = []
    return repo


@pytest.fixture
def event_service(event_mock_repo: AsyncMock) -> EventService:
    svc = EventService(repository=event_mock_repo)
    svc.read_schema = EventRead
    return svc


class TestEventServiceCreate:
    async def test_creates_and_returns_schema(
        self, event_service: EventService, event_mock_repo: AsyncMock
    ) -> None:
        create_data = EventCreate(
            user_id=1,
            task_id="abc",
            node_id="node_001",
            trigger={"kind": "mechanical", "action": "cell_paint"},
            state_snapshot=[[0, 1]],
            timestamp=1625000000000,
        )
        result = await event_service.create(create_data)
        assert isinstance(result, EventRead)
        assert result.node_id == "node_001"
        event_mock_repo.create.assert_awaited_once()


class TestEventServiceGetByUserAndTask:
    async def test_returns_empty_list(
        self, event_service: EventService, event_mock_repo: AsyncMock
    ) -> None:
        result = await event_service.get_events_by_user_and_task(1, "abc")
        assert result == []
        event_mock_repo.get_by_user_and_task.assert_awaited_with(
            1, "abc", attempt_id=None
        )

    async def test_returns_list_of_schemas(
        self, event_service: EventService, event_mock_repo: AsyncMock
    ) -> None:
        event_mock_repo.get_by_user_and_task.return_value = [
            Event(
                id=1,
                user_id=1,
                task_id="abc",
                attempt_id=1,
                node_id="node_001",
                trigger={"kind": "mechanical"},
                state_snapshot=[[0]],
                timestamp=1,
            ),
            Event(
                id=2,
                user_id=1,
                task_id="abc",
                attempt_id=1,
                node_id="node_002",
                trigger={"kind": "mechanical"},
                state_snapshot=[[1]],
                timestamp=2,
            ),
        ]
        result = await event_service.get_events_by_user_and_task(1, "abc")
        assert len(result) == 2
        assert isinstance(result[0], EventRead)
        assert result[0].node_id == "node_001"
        assert result[1].node_id == "node_002"

    async def test_filters_by_attempt_id(
        self, event_service: EventService, event_mock_repo: AsyncMock
    ) -> None:
        event_mock_repo.get_by_user_and_task.return_value = []
        result = await event_service.get_events_by_user_and_task(
            1, "abc", attempt_id=1
        )
        assert result == []
        event_mock_repo.get_by_user_and_task.assert_awaited_with(
            1, "abc", attempt_id=1
        )


@pytest.fixture
def attempt_mock_repo() -> AsyncMock:
    repo = AsyncMock()

    async def create_side_effect(data):
        return Attempt(id=1, **data)

    repo.create.side_effect = create_side_effect
    repo.get_by_user_and_task.return_value = []
    repo.get_by_id.side_effect = ObjectNotFoundError("Attempt", 0)
    return repo


@pytest.fixture
def attempt_service(attempt_mock_repo: AsyncMock) -> AttemptService:
    svc = AttemptService(repository=attempt_mock_repo)
    svc.read_schema = AttemptRead
    return svc


class TestAttemptServiceCreate:
    async def test_creates_and_returns_schema(
        self, attempt_service: AttemptService, attempt_mock_repo: AsyncMock
    ) -> None:
        create_data = AttemptCreate(user_id=1, task_id="00576224")
        result = await attempt_service.create(create_data)
        assert isinstance(result, AttemptRead)
        assert result.id == 1
        assert result.user_id == 1
        assert result.task_id == "00576224"
        attempt_mock_repo.create.assert_awaited_with(
            {"user_id": 1, "task_id": "00576224"}
        )


class TestAttemptServiceGetByUserAndTask:
    async def test_returns_empty_list(
        self, attempt_service: AttemptService, attempt_mock_repo: AsyncMock
    ) -> None:
        result = await attempt_service.get_by_user_and_task(1, "abc")
        assert result == []
        attempt_mock_repo.get_by_user_and_task.assert_awaited_with(1, "abc")

    async def test_returns_list_of_schemas(
        self, attempt_service: AttemptService, attempt_mock_repo: AsyncMock
    ) -> None:
        attempt_mock_repo.get_by_user_and_task.return_value = [
            Attempt(id=2, user_id=1, task_id="abc"),
            Attempt(id=1, user_id=1, task_id="abc"),
        ]
        result = await attempt_service.get_by_user_and_task(1, "abc")
        assert len(result) == 2
        assert isinstance(result[0], AttemptRead)
        assert result[0].id == 2
