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
