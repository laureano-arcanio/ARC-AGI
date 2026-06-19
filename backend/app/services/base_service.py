from typing import TypeVar

from app.models import AbstractBase
from app.repositories.base_repository import BaseRepository
from app.types.base import BaseAPISchema

ModelType = TypeVar("ModelType", bound=AbstractBase)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseAPISchema)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseAPISchema)
ReadSchemaType = TypeVar("ReadSchemaType", bound=BaseAPISchema)


class BaseService[
    ModelType,
    CreateSchemaType,
    UpdateSchemaType,
    ReadSchemaType,
]:
    repository: BaseRepository[ModelType]
    read_schema: type[ReadSchemaType]

    def __init__(self, repository: BaseRepository[ModelType]):
        self.repository = repository

    async def get_all(self) -> list[ReadSchemaType]:
        instances = await self.repository.get_all()
        return [self.read_schema.model_validate(inst) for inst in instances]  # type: ignore[attr-defined]

    async def get_by_id(self, id: int) -> ReadSchemaType:
        instance = await self.repository.get_by_id(id)
        return self.read_schema.model_validate(instance)  # type: ignore[attr-defined, no-any-return]

    async def create(self, data: CreateSchemaType) -> ReadSchemaType:
        instance = await self.repository.create(data.model_dump())  # type: ignore[attr-defined]
        return self.read_schema.model_validate(instance)  # type: ignore[attr-defined, no-any-return]

    async def update(self, id: int, data: UpdateSchemaType) -> ReadSchemaType:
        instance = await self.repository.update(
            id, data.model_dump(exclude_unset=True)  # type: ignore[attr-defined]
        )
        return self.read_schema.model_validate(instance)  # type: ignore[attr-defined, no-any-return]

    async def delete(self, id: int) -> None:
        await self.repository.delete(id)
