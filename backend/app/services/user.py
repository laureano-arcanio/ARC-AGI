from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.base_service import BaseService


class UserService(
    BaseService[User, UserCreate, UserUpdate, UserRead]
):
    repository: UserRepository
    read_schema = UserRead

    async def get_by_uuid(self, uuid: str) -> UserRead:
        instance = await self.repository.get_by_uuid(uuid)
        return self.read_schema.model_validate(instance)
