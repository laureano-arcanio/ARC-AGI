from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.base import ExecutableOption
from sqlalchemy.sql.expression import UnaryExpression

from app.errors import ObjectNotFoundError
from app.models import AbstractBase

ModelType = TypeVar("ModelType", bound=AbstractBase)


class BaseRepository[ModelType]:
    model: type[ModelType]

    detail_options: list[ExecutableOption] = []
    list_options: list[ExecutableOption] = []
    list_order: list[UnaryExpression[Any]] = []

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _get_db_instance_by_id(
        self, id: int, options: list[ExecutableOption] | None = None
    ) -> ModelType:
        if options:
            query = select(self.model).where(self.model.id == id).options(*options)  # type: ignore[attr-defined]
        else:
            query = select(self.model).where(self.model.id == id)  # type: ignore[attr-defined]
        result = await self.db_session.execute(query)
        db_instance = result.scalar_one_or_none()
        if not db_instance:
            raise ObjectNotFoundError(object_type=self.model.__name__, object_id=id)
        return db_instance

    async def get_all(
        self, options: list[ExecutableOption] | None = None
    ) -> list[ModelType]:
        query = select(self.model)
        if options:
            query = query.options(*options)
        else:
            query = query.options(*self.list_options)

        if self.list_order:
            query = query.order_by(*self.list_order)

        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def create(self, data: dict[str, Any]) -> ModelType:
        db_instance = self.model(**data)
        self.db_session.add(db_instance)
        await self.db_session.flush()
        return db_instance

    async def get_by_id(
        self, id: int, options: list[ExecutableOption] | None = None
    ) -> ModelType:
        return await self._get_db_instance_by_id(
            id, options=options or self.detail_options
        )

    async def update(self, id: int, data: dict[str, Any]) -> ModelType:
        db_instance = await self._get_db_instance_by_id(id)
        for key, value in data.items():
            setattr(db_instance, key, value)
        self.db_session.add(db_instance)
        await self.db_session.flush()
        await self.db_session.refresh(db_instance)
        return db_instance

    async def delete(self, id: int) -> None:
        db_instance = await self._get_db_instance_by_id(id)
        await self.db_session.delete(db_instance)
        await self.db_session.flush()
