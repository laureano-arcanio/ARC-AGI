from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.event import Event
from app.repositories.base_repository import BaseRepository


class EventRepository(BaseRepository[Event]):
    model = Event

    async def create(self, data: dict[str, Any]) -> Event:
        try:
            db_instance = self.model(**data)
            self.db_session.add(db_instance)
            await self.db_session.flush()
            return db_instance
        except IntegrityError:
            await self.db_session.rollback()
            conditions = [
                self.model.attempt_id == data.get("attempt_id"),
                self.model.node_id == data.get("node_id"),
            ]
            tpi = data.get("test_pair_index")
            if tpi is not None:
                conditions.append(self.model.test_pair_index == tpi)
            else:
                conditions.append(self.model.test_pair_index.is_(None))
            query = select(self.model).where(*conditions)
            result = await self.db_session.execute(query)
            return result.scalar_one()

    async def get_by_user_and_task(
        self,
        user_id: int,
        task_id: str,
        attempt_id: int | None = None,
    ) -> list[Event]:
        query = select(self.model).where(
            self.model.user_id == user_id,
            self.model.task_id == task_id,
        )
        if attempt_id is not None:
            query = query.where(self.model.attempt_id == attempt_id)
        query = query.order_by(self.model.timestamp)
        result = await self.db_session.execute(query)
        return list(result.scalars().all())
