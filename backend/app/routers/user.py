from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import AdminDep, CurrentUserDep
from app.dependencies.database import DatabaseSession
from app.repositories.attempt import AttemptRepository
from app.repositories.user import UserRepository
from app.schemas.attempt import UserTaskSummary
from app.schemas.user import LoginResponse, UserCreate, UserLogin, UserRead, UserUpdate
from app.services.attempt import AttemptService
from app.services.user import UserService

router = APIRouter(prefix="/api/v1/users", tags=["users"])


async def get_service(db_session: DatabaseSession) -> UserService:
    repository = UserRepository(db_session=db_session)
    return UserService(repository=repository)


async def get_attempt_service(db_session: DatabaseSession) -> AttemptService:
    repository = AttemptRepository(db_session=db_session)
    return AttemptService(repository=repository)


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create(
    data: UserCreate,
    service: UserService = Depends(get_service),  # noqa: B008
) -> UserRead:
    return await service.create(data)


@router.post("/login", response_model=LoginResponse)
async def login(
    data: UserLogin,
    service: UserService = Depends(get_service),  # noqa: B008
) -> LoginResponse:
    return await service.authenticate(data.email, data.password)


@router.get("/", response_model=list[UserRead])
async def get_all(
    service: UserService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[UserRead]:
    return await service.get_all()


@router.put("/{id}", response_model=UserRead)
async def update(
    id: int,
    data: UserUpdate,
    service: UserService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> UserRead:
    return await service.update(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    id: int,
    service: UserService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(id)


@router.get("/{id}/tasks", response_model=list[UserTaskSummary])
async def get_user_tasks(
    id: int,
    service: AttemptService = Depends(get_attempt_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> list[UserTaskSummary]:
    if current_user.role != "admin" and current_user.user_id != id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return await service.get_user_tasks(id)


@router.get("/{id}", response_model=UserRead)
async def get_by_id(
    id: int,
    service: UserService = Depends(get_service),  # noqa: B008
    current_user: CurrentUserDep = None,  # type: ignore[assignment]
) -> UserRead:
    if current_user.role != "admin" and current_user.user_id != id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return await service.get_by_id(id)
