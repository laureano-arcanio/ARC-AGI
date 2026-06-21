from fastapi import APIRouter, Depends, status

from app.dependencies.auth import AdminDep
from app.dependencies.database import DatabaseSession
from app.repositories.example_table import ExampleTableRepository
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.services.example_table import ExampleTableService

router = APIRouter(prefix="/api/v1/example-tables", tags=["example-tables"])


async def get_service(db_session: DatabaseSession) -> ExampleTableService:
    repository = ExampleTableRepository(db_session=db_session)
    return ExampleTableService(repository=repository)


@router.get("/", response_model=list[ExampleTableRead])
async def get_all(
    service: ExampleTableService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[ExampleTableRead]:
    return await service.get_all()


@router.get("/{id}", response_model=ExampleTableRead)
async def get_by_id(
    id: int,
    service: ExampleTableService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ExampleTableRead:
    return await service.get_by_id(id)


@router.post("/", response_model=ExampleTableRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: ExampleTableCreate,
    service: ExampleTableService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ExampleTableRead:
    return await service.create(data)


@router.put("/{id}", response_model=ExampleTableRead)
async def update(
    id: int,
    data: ExampleTableUpdate,
    service: ExampleTableService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ExampleTableRead:
    return await service.update(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    id: int,
    service: ExampleTableService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(id)
