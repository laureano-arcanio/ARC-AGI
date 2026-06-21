import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-purposes-32char")

from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.event import Event
from app.models.example_table import ExampleTable
from app.models.user import User, UserRole


class MockResult:
    def __init__(self, scalar_one_or_none_result=None, scalars_all_result=None):
        self._scalar_one_or_none = scalar_one_or_none_result
        self._scalars_all = scalars_all_result

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def scalars(self):
        return self

    def all(self):
        return self._scalars_all


class MockAsyncSession:
    def __init__(self):
        self.added: list = []
        self.deleted: list = []
        self.flushed = False
        self.refreshed: list = []
        self._execute_result: MockResult | None = None

    def set_execute_result(self, result: MockResult) -> None:
        self._execute_result = result

    async def execute(self, _query):  # type: ignore[no-untyped-def]
        return self._execute_result

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        self.flushed = True

    async def refresh(self, instance: object) -> None:
        self.refreshed.append(instance)

    async def delete(self, instance: object) -> None:
        self.deleted.append(instance)


@pytest.fixture
def db_session() -> MockAsyncSession:
    return MockAsyncSession()


@pytest.fixture
def sample_example_table() -> ExampleTable:
    return ExampleTable(id=1, name="sample", description="a sample entry")


@pytest.fixture
def sample_example_tables() -> list[ExampleTable]:
    return [
        ExampleTable(id=1, name="first", description="first entry"),
        ExampleTable(id=2, name="second", description="second entry"),
    ]


@pytest.fixture
def sample_user() -> User:
    return User(
        id=1, email="test@example.com", password_hash="hashed", role=UserRole.SOLVER
    )


@pytest.fixture
def sample_attempt() -> Attempt:
    return Attempt(id=1, user_id=1, task_id="00576224")


@pytest.fixture
def sample_attempts() -> list[Attempt]:
    return [
        Attempt(id=2, user_id=1, task_id="00576224"),
        Attempt(id=1, user_id=1, task_id="00576224"),
    ]


@pytest.fixture
def sample_event() -> Event:
    return Event(
        id=1,
        user_id=1,
        task_id="00576224",
        attempt_id=1,
        node_id="node_001",
        parent_node_id="node_000",
        trigger={"kind": "mechanical", "action": "cell_click"},
        state_snapshot=[[0, 1, 0], [0, 0, 0]],
        timestamp=1625000000000,
    )


@pytest.fixture
def sample_events() -> list[Event]:
    return [
        Event(
            id=1,
            user_id=1,
            task_id="00576224",
            attempt_id=1,
            node_id="node_001",
            parent_node_id="node_000",
            trigger={"kind": "mechanical", "action": "cell_click"},
            state_snapshot=[[0, 1, 0]],
            timestamp=1625000000000,
        ),
        Event(
            id=2,
            user_id=1,
            task_id="00576224",
            attempt_id=1,
            node_id="node_002",
            parent_node_id="node_001",
            trigger={"kind": "mechanical", "action": "submit"},
            state_snapshot=[[1, 0, 0]],
            timestamp=1625000001000,
        ),
    ]


@pytest.fixture
def mock_async_session() -> AsyncMock:
    return AsyncMock(spec=AsyncSession)
