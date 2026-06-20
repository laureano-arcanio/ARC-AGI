from fastapi import APIRouter, Depends, status

from app.dependencies.database import DatabaseSession
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserRead
from app.services.user import UserService

router = APIRouter(prefix="/api/v1/users", tags=["users"])


async def get_service(db_session: DatabaseSession) -> UserService:
    repository = UserRepository(db_session=db_session)
    return UserService(repository=repository)


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: UserCreate,
    service: UserService = Depends(get_service),  # noqa: B008
) -> UserRead:
    return await service.create(data)


@router.get("/by-uuid/{uuid}", response_model=UserRead)
async def get_by_uuid(
    uuid: str,
    service: UserService = Depends(get_service),  # noqa: B008
) -> UserRead:
    return await service.get_by_uuid(uuid)


@router.get("/{id}", response_model=UserRead)
async def get_by_id(
    id: int,
    service: UserService = Depends(get_service),  # noqa: B008
) -> UserRead:
    return await service.get_by_id(id)
