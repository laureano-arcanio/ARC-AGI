from datetime import UTC, datetime

import pytest

from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)


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
