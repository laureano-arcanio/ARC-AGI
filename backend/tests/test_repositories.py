import pytest

from app.errors import ObjectNotFoundError
from app.models.attempt import Attempt
from app.models.event import Event
from app.models.example_table import ExampleTable
from app.models.user import User
from app.repositories.attempt import AttemptRepository
from app.repositories.event import EventRepository
from app.repositories.example_table import ExampleTableRepository
from app.repositories.user import UserRepository
from tests.conftest import MockAsyncSession, MockResult


@pytest.fixture
def repo(db_session: MockAsyncSession) -> ExampleTableRepository:
    return ExampleTableRepository(db_session=db_session)


class TestExampleTableRepositoryGetAll:
    async def test_returns_empty_list_when_no_rows(
        self, repo: ExampleTableRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await repo.get_all()
        assert result == []

    async def test_returns_all_instances(
        self,
        repo: ExampleTableRepository,
        db_session: MockAsyncSession,
        sample_example_tables: list[ExampleTable],
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=sample_example_tables)
        )
        result = await repo.get_all()
        assert len(result) == 2
        assert result[0].name == "first"
        assert result[1].name == "second"


class TestExampleTableRepositoryGetById:
    async def test_returns_instance_when_found(
        self,
        repo: ExampleTableRepository,
        db_session: MockAsyncSession,
        sample_example_table: ExampleTable,
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=sample_example_table)
        )
        result = await repo.get_by_id(1)
        assert result.id == 1
        assert result.name == "sample"

    async def test_raises_when_not_found(
        self, repo: ExampleTableRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError) as exc:
            await repo.get_by_id(999)
        assert "ExampleTable" in str(exc.value.message)
        assert "999" in str(exc.value.message)


class TestExampleTableRepositoryCreate:
    async def test_creates_and_returns_instance(
        self,
        repo: ExampleTableRepository,
        db_session: MockAsyncSession,
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        data = {"name": "new-entry", "description": "brand new"}
        result = await repo.create(data)
        assert result.name == "new-entry"
        assert result.description == "brand new"
        assert len(db_session.added) == 1
        assert db_session.flushed is True

    async def test_creates_without_optional_fields(
        self, repo: ExampleTableRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        data = {"name": "minimal"}
        result = await repo.create(data)
        assert result.name == "minimal"
        assert result.description is None


class TestExampleTableRepositoryUpdate:
    async def test_updates_existing_instance(
        self,
        repo: ExampleTableRepository,
        db_session: MockAsyncSession,
        sample_example_table: ExampleTable,
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=sample_example_table)
        )
        result = await repo.update(1, {"name": "updated", "description": "new desc"})
        assert result.name == "updated"
        assert result.description == "new desc"
        assert db_session.flushed is True
        assert len(db_session.refreshed) == 1

    async def test_raises_when_updating_nonexistent(
        self, repo: ExampleTableRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await repo.update(999, {"name": "nope"})


class TestExampleTableRepositoryDelete:
    async def test_deletes_existing_instance(
        self,
        repo: ExampleTableRepository,
        db_session: MockAsyncSession,
        sample_example_table: ExampleTable,
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=sample_example_table)
        )
        await repo.delete(1)
        assert len(db_session.deleted) == 1
        assert db_session.deleted[0].id == 1
        assert db_session.flushed is True

    async def test_raises_when_deleting_nonexistent(
        self, repo: ExampleTableRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await repo.delete(999)


@pytest.fixture
def user_repo(db_session: MockAsyncSession) -> UserRepository:
    return UserRepository(db_session=db_session)


class TestUserRepositoryCreate:
    async def test_creates_instance(
        self, user_repo: UserRepository, db_session: MockAsyncSession
    ) -> None:
        result = await user_repo.create(
            {"email": "user@test.com", "password_hash": "hash", "role": "solver"}
        )
        assert isinstance(result, User)
        assert result.email == "user@test.com"
        assert result.password_hash == "hash"
        assert result.role == "solver"
        assert len(db_session.added) == 1
        assert db_session.flushed is True


class TestUserRepositoryGetById:
    async def test_returns_instance_when_found(
        self,
        user_repo: UserRepository,
        db_session: MockAsyncSession,
        sample_user: User,
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=sample_user)
        )
        result = await user_repo.get_by_id(1)
        assert result.id == 1
        assert result.email == "test@example.com"
        assert result.role == "solver"

    async def test_raises_when_not_found(
        self, user_repo: UserRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await user_repo.get_by_id(999)


class TestUserRepositoryGetByEmail:
    async def test_returns_instance_when_found(
        self,
        user_repo: UserRepository,
        db_session: MockAsyncSession,
        sample_user: User,
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=sample_user)
        )
        result = await user_repo.get_by_email("test@example.com")
        assert result.id == 1
        assert result.email == "test@example.com"
        assert result.role == "solver"

    async def test_raises_when_not_found(
        self, user_repo: UserRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        with pytest.raises(ObjectNotFoundError):
            await user_repo.get_by_email("nonexistent@test.com")


@pytest.fixture
def event_repo(db_session: MockAsyncSession) -> EventRepository:
    return EventRepository(db_session=db_session)


class TestEventRepositoryCreate:
    async def test_creates_instance(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        data = {
            "user_id": 1,
            "task_id": "abc",
            "node_id": "node_001",
            "parent_node_id": "node_000",
            "trigger": {"kind": "mechanical", "action": "cell_paint"},
            "state_snapshot": [[0, 1, 0]],
            "timestamp": 1625000000000,
        }
        result = await event_repo.create(data)
        assert result.user_id == 1
        assert result.task_id == "abc"
        assert result.node_id == "node_001"
        assert len(db_session.added) == 1
        assert db_session.flushed is True


class TestEventRepositoryGetByUserAndTask:
    async def test_returns_empty_list_when_no_events(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await event_repo.get_by_user_and_task(1, "abc")
        assert result == []

    async def test_returns_events(
        self,
        event_repo: EventRepository,
        db_session: MockAsyncSession,
        sample_events: list[Event],
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=sample_events)
        )
        result = await event_repo.get_by_user_and_task(1, "00576224")
        assert len(result) == 2
        assert result[0].node_id == "node_001"
        assert result[1].node_id == "node_002"

    async def test_filters_by_attempt_id(
        self,
        event_repo: EventRepository,
        db_session: MockAsyncSession,
        sample_events: list[Event],
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=sample_events)
        )
        result = await event_repo.get_by_user_and_task(
            1, "00576224", attempt_id=1
        )
        assert len(result) == 2


@pytest.fixture
def attempt_repo(db_session: MockAsyncSession) -> AttemptRepository:
    return AttemptRepository(db_session=db_session)


class TestEventRepositoryGetTimeline:
    async def test_returns_empty_list(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await event_repo.get_timeline(None, 0)
        assert result == []

    async def test_returns_buckets(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        from datetime import datetime
        from types import SimpleNamespace

        dt = datetime(2024, 1, 1, 10, 0, 0)
        db_session.set_execute_result(
            MockResult(
                scalars_all_result=[
                    SimpleNamespace(bucket=dt, count=5),
                    SimpleNamespace(bucket=datetime(2024, 1, 1, 11, 0, 0), count=3),
                ]
            )
        )
        result = await event_repo.get_timeline(None, 1704063600000)
        assert len(result) == 2
        assert result[0].bucket == dt
        assert result[0].count == 5

    async def test_filters_by_event_types(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await event_repo.get_timeline(["cell_paint", "submit"], 0)
        assert result == []


class TestEventRepositoryGetLastEventTimestamp:
    async def test_returns_timestamp_when_exists(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalar_one_or_none_result=1704067200000)
        )
        result = await event_repo.get_last_event_timestamp()
        assert result == 1704067200000

    async def test_returns_none_when_no_events(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        result = await event_repo.get_last_event_timestamp()
        assert result is None


class TestEventRepositoryGetActiveUsersCount:
    async def test_returns_count(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=5))
        result = await event_repo.get_active_users_count(1704063600000)
        assert result == 5

    async def test_returns_zero_when_none(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        result = await event_repo.get_active_users_count(1704063600000)
        assert result == 0


class TestEventRepositoryGetEventTypeSummary:
    async def test_returns_summary(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        from types import SimpleNamespace

        db_session.set_execute_result(
            MockResult(
                scalars_all_result=[
                    SimpleNamespace(type="cell_paint", count=10),
                    SimpleNamespace(type="submit", count=3),
                ]
            )
        )
        result = await event_repo.get_event_type_summary(None, 0)
        assert len(result) == 2
        assert result[0].type == "cell_paint"
        assert result[0].count == 10
        assert result[1].type == "submit"

    async def test_returns_empty_when_no_events(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await event_repo.get_event_type_summary(None, 0)
        assert result == []

    async def test_filters_by_event_types(
        self, event_repo: EventRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await event_repo.get_event_type_summary(
            ["cell_paint"], 1704063600000
        )
        assert result == []


class TestAttemptRepositoryCreate:
    async def test_creates_instance(
        self, attempt_repo: AttemptRepository, db_session: MockAsyncSession
    ) -> None:
        result = await attempt_repo.create(
            {"user_id": 1, "task_id": "00576224"}
        )
        assert isinstance(result, Attempt)
        assert result.user_id == 1
        assert result.task_id == "00576224"
        assert len(db_session.added) == 1
        assert db_session.flushed is True


class TestAttemptRepositoryGetByUserAndTask:
    async def test_returns_empty_list_when_no_attempts(
        self, attempt_repo: AttemptRepository, db_session: MockAsyncSession
    ) -> None:
        db_session.set_execute_result(MockResult(scalars_all_result=[]))
        result = await attempt_repo.get_by_user_and_task(1, "abc")
        assert result == []

    async def test_returns_attempts_ordered_by_created_desc(
        self,
        attempt_repo: AttemptRepository,
        db_session: MockAsyncSession,
        sample_attempts: list[Attempt],
    ) -> None:
        db_session.set_execute_result(
            MockResult(scalars_all_result=sample_attempts)
        )
        result = await attempt_repo.get_by_user_and_task(1, "00576224")
        assert len(result) == 2
        assert result[0].id == 2
