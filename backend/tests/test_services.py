from unittest.mock import AsyncMock

import pytest

from app.errors import ObjectNotFoundError
from app.models.example_table import ExampleTable
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.services.example_table import ExampleTableService


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
