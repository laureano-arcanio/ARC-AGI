from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.attempt import AttemptCreate, AttemptRead
from app.schemas.event import EventCreate, EventRead, EventUpdate
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.schemas.user import UserCreate, UserRead


class TestExampleTableCreate:
    def test_valid_create(self) -> None:
        data = ExampleTableCreate(name="test", description="a description")
        assert data.name == "test"
        assert data.description == "a description"

    def test_create_without_optional_description(self) -> None:
        data = ExampleTableCreate(name="minimal")
        assert data.name == "minimal"
        assert data.description is None

    def test_create_without_name_raises(self) -> None:
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            ExampleTableCreate()  # type: ignore[call-arg]

    def test_camelcase_alias(self) -> None:
        data = ExampleTableCreate.model_construct(name="alias-test")
        dumped = data.model_dump(by_alias=True)
        assert "name" in dumped

    def test_model_dump_for_repo(self) -> None:
        data = ExampleTableCreate(name="repo-ready")
        dumped = data.model_dump()
        assert dumped == {"name": "repo-ready", "description": None}


class TestExampleTableUpdate:
    def test_all_fields_optional(self) -> None:
        data = ExampleTableUpdate()
        assert data.name is None
        assert data.description is None

    def test_partial_update(self) -> None:
        data = ExampleTableUpdate(name="updated-name")
        assert data.name == "updated-name"
        assert data.description is None

    def test_exclude_unset(self) -> None:
        data = ExampleTableUpdate(name="only-name")
        dumped = data.model_dump(exclude_unset=True)
        assert dumped == {"name": "only-name"}


class TestExampleTableRead:
    def test_full_read_schema(self) -> None:
        now = datetime.now(UTC)
        data = ExampleTableRead(
            id=1, name="read-test", description="desc", created_at=now, updated_at=now
        )
        assert data.id == 1
        assert data.name == "read-test"
        assert data.description == "desc"
        assert data.created_at == now
        assert data.updated_at == now

    def test_read_with_nulls(self) -> None:
        data = ExampleTableRead(id=2, name="nulls-test")
        assert data.description is None
        assert data.created_at is None
        assert data.updated_at is None

    def test_from_attributes(self) -> None:
        from pydantic import BaseModel

        class FakeORM(BaseModel):
            id: int = 10
            name: str = "orm-test"
            description: str = "from orm"
            created_at: datetime | None = datetime.now(UTC)
            updated_at: datetime | None = datetime.now(UTC)

            model_config = {"from_attributes": True}

        data = ExampleTableRead.model_validate(FakeORM())
        assert data.id == 10
        assert data.name == "orm-test"
        assert data.description == "from orm"


class TestUserCreate:
    def test_creates_without_fields(self) -> None:
        data = UserCreate(email="test@example.com", password="secret123")
        assert isinstance(data, UserCreate)
        assert data.email == "test@example.com"
        assert data.password == "secret123"
        assert data.role == "solver"

    def test_creates_with_role(self) -> None:
        data = UserCreate(email="test@example.com", password="secret123", role="admin")
        assert data.role == "admin"

    def test_model_dump(self) -> None:
        data = UserCreate(email="test@example.com", password="secret123")
        dumped = data.model_dump()
        assert dumped["email"] == "test@example.com"
        assert dumped["password"] == "secret123"
        assert dumped["role"] == "solver"

    def test_model_dump_with_role(self) -> None:
        data = UserCreate(email="test@example.com", password="secret123", role="admin")
        dumped = data.model_dump()
        assert dumped["role"] == "admin"

    def test_missing_email_raises(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(password="secret123")

    def test_missing_password_raises(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com")


class TestUserRead:
    def test_full_read_schema(self) -> None:
        now = datetime.now(UTC)
        data = UserRead(
            id=1,
            email="test@example.com",
            role="solver",
            created_at=now,
            updated_at=now,
        )
        assert data.id == 1
        assert data.email == "test@example.com"
        assert data.role == "solver"
        assert data.created_at == now
        assert data.updated_at == now

    def test_read_defaults(self) -> None:
        data = UserRead(id=2, email="user2@example.com", role="admin")
        assert data.created_at is None
        assert data.updated_at is None

    def test_from_attributes(self) -> None:
        from pydantic import BaseModel

        class FakeORM(BaseModel):
            id: int = 1
            email: str = "orm@example.com"
            role: str = "solver"
            created_at: datetime | None = datetime.now(UTC)
            updated_at: datetime | None = None

            model_config = {"from_attributes": True}

        data = UserRead.model_validate(FakeORM())
        assert data.id == 1
        assert data.email == "orm@example.com"
        assert data.role == "solver"


class TestEventCreate:
    def test_valid_create(self) -> None:
        data = EventCreate(
            user_id=1,
            task_id="00576224",
            attempt_id=1,
            node_id="node_001",
            parent_node_id="node_000",
            trigger={"kind": "mechanical", "action": "cell_click"},
            state_snapshot=[[0, 1, 0]],
            timestamp=1625000000000,
        )
        assert data.user_id == 1
        assert data.task_id == "00576224"
        assert data.attempt_id == 1
        assert data.node_id == "node_001"
        assert data.parent_node_id == "node_000"
        assert data.trigger == {"kind": "mechanical", "action": "cell_click"}
        assert data.state_snapshot == [[0, 1, 0]]
        assert data.timestamp == 1625000000000

    def test_create_without_optional_parent(self) -> None:
        data = EventCreate(
            user_id=1,
            task_id="abc",
            node_id="node_000",
            trigger={"kind": "mechanical", "action": "load_task"},
            state_snapshot=[[0, 0], [0, 0]],
            timestamp=1625000000000,
        )
        assert data.parent_node_id is None
        assert data.attempt_id is None

    def test_missing_required_raises(self) -> None:
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            EventCreate()  # type: ignore[call-arg]

    def test_model_dump_for_repo(self) -> None:
        data = EventCreate(
            user_id=1,
            task_id="abc",
            attempt_id=1,
            node_id="node_000",
            trigger={"kind": "mechanical"},
            state_snapshot=[[0]],
            timestamp=1,
        )
        dumped = data.model_dump()
        assert dumped["user_id"] == 1
        assert dumped["attempt_id"] == 1
        assert dumped["parent_node_id"] is None

    def test_camelcase_alias(self) -> None:
        data = EventCreate.model_construct(
            user_id=1,
            task_id="abc",
            node_id="node_000",
            trigger={"kind": "mechanical"},
            state_snapshot=[[0]],
            timestamp=1,
        )
        dumped = data.model_dump(by_alias=True)
        assert "userId" in dumped
        assert "taskId" in dumped
        assert "attemptId" in dumped
        assert "nodeId" in dumped
        assert "parentNodeId" in dumped
        assert "stateSnapshot" in dumped


class TestEventUpdate:
    def test_empty_update(self) -> None:
        data = EventUpdate()
        assert isinstance(data, EventUpdate)


class TestEventRead:
    def test_full_read_schema(self) -> None:
        now = datetime.now(UTC)
        data = EventRead(
            id=1,
            user_id=1,
            task_id="abc",
            attempt_id=1,
            node_id="node_000",
            trigger={"kind": "mechanical", "action": "cell_click"},
            state_snapshot=[[0, 1, 0]],
            timestamp=1625000000000,
            created_at=now,
            updated_at=now,
        )
        assert data.id == 1
        assert data.task_id == "abc"
        assert data.attempt_id == 1
        assert data.trigger == {"kind": "mechanical", "action": "cell_click"}

    def test_read_with_nulls(self) -> None:
        data = EventRead(
            id=1,
            user_id=1,
            task_id="abc",
            node_id="node_000",
            trigger={},
            state_snapshot=[],
            timestamp=0,
        )
        assert data.parent_node_id is None
        assert data.attempt_id is None
        assert data.created_at is None

    def test_from_attributes(self) -> None:
        from pydantic import BaseModel

        class FakeORM(BaseModel):
            id: int = 1
            user_id: int = 1
            task_id: str = "abc"
            attempt_id: int | None = None
            node_id: str = "node_000"
            parent_node_id: str | None = None
            trigger: dict = {"kind": "mechanical"}
            state_snapshot: list = [[0]]
            timestamp: int = 1
            created_at: datetime | None = None
            updated_at: datetime | None = None

            model_config = {"from_attributes": True}

        data = EventRead.model_validate(FakeORM())
        assert data.id == 1
        assert data.task_id == "abc"


class TestAttemptCreate:
    def test_valid_create(self) -> None:
        data = AttemptCreate(user_id=1, task_id="00576224")
        assert data.user_id == 1
        assert data.task_id == "00576224"

    def test_missing_required_raises(self) -> None:
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            AttemptCreate()  # type: ignore[call-arg]

    def test_model_dump(self) -> None:
        data = AttemptCreate(user_id=1, task_id="abc")
        dumped = data.model_dump()
        assert dumped == {"user_id": 1, "task_id": "abc"}

    def test_camelcase_alias(self) -> None:
        data = AttemptCreate.model_construct(user_id=1, task_id="abc")
        dumped = data.model_dump(by_alias=True)
        assert "userId" in dumped
        assert "taskId" in dumped


class TestAttemptRead:
    def test_full_read_schema(self) -> None:
        now = datetime.now(UTC)
        data = AttemptRead(
            id=1, user_id=1, task_id="abc", created_at=now, updated_at=now
        )
        assert data.id == 1
        assert data.user_id == 1
        assert data.task_id == "abc"
        assert data.created_at == now
        assert data.updated_at == now

    def test_read_defaults(self) -> None:
        data = AttemptRead(id=1, user_id=1, task_id="abc")
        assert data.created_at is None
        assert data.updated_at is None

    def test_from_attributes(self) -> None:
        from pydantic import BaseModel

        class FakeORM(BaseModel):
            id: int = 1
            user_id: int = 1
            task_id: str = "abc"
            created_at: datetime | None = datetime.now(UTC)
            updated_at: datetime | None = None

            model_config = {"from_attributes": True}

        data = AttemptRead.model_validate(FakeORM())
        assert data.id == 1
        assert data.user_id == 1
        assert data.task_id == "abc"
