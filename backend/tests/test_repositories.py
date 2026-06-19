import pytest

from app.errors import ObjectNotFoundError
from app.models.example_table import ExampleTable
from app.repositories.example_table import ExampleTableRepository
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
