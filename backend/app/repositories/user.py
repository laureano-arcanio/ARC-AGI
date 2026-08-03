from sqlalchemy import select

from app.errors import ObjectNotFoundError
from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User:
        query = select(self.model).where(self.model.email == email)
        result = await self.db_session.execute(query)
        db_instance = result.scalar_one_or_none()
        if not db_instance:
            raise ObjectNotFoundError(object_type="User", object_id=email)
        return db_instance

    async def get_by_ids(self, ids: list[int]) -> list[User]:
        if not ids:
            return []
        query = select(self.model).where(self.model.id.in_(ids))
        result = await self.db_session.execute(query)
        return list(result.scalars().all())
