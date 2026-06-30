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
            existing = result.scalar_one()
            existing.trigger = data.get("trigger", existing.trigger)
            existing.state_snapshot = data.get(
                "state_snapshot", existing.state_snapshot
            )
            existing.timestamp = data.get("timestamp", existing.timestamp)
            if "parent_node_id" in data:
                existing.parent_node_id = data["parent_node_id"]
            if "sequence_index" in data:
                existing.sequence_index = data["sequence_index"]
            await self.db_session.flush()
            await self.db_session.refresh(existing)
            return existing

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
        query = query.order_by(self.model.sequence_index, self.model.timestamp)
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def has_solver_events(
        self, attempt_id: int
    ) -> bool:
        """Check if an attempt has at least one non-pre-solver event."""
        query = (
            select(self.model.id)
            .where(
                self.model.attempt_id == attempt_id,
                self.model.node_id.notlike("pre_node_%"),
            )
            .limit(1)
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none() is not None

    async def parent_node_exists(
        self, attempt_id: int, node_id: str, test_pair_index: int | None
    ) -> bool:
        query = select(self.model.id).where(
            self.model.attempt_id == attempt_id,
            self.model.node_id == node_id,
        )
        if test_pair_index is not None:
            query = query.where(self.model.test_pair_index == test_pair_index)
        else:
            query = query.where(self.model.test_pair_index.is_(None))
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_snapshot_by_node(
        self,
        attempt_id: int,
        node_id: str,
        test_pair_index: int | None,
    ) -> list[Any] | None:
        query = select(self.model.state_snapshot).where(
            self.model.attempt_id == attempt_id,
            self.model.node_id == node_id,
        )
        if test_pair_index is not None:
            query = query.where(self.model.test_pair_index == test_pair_index)
        else:
            query = query.where(self.model.test_pair_index.is_(None))
        result = await self.db_session.execute(query)
        row = result.one_or_none()
        return row[0] if row else None
