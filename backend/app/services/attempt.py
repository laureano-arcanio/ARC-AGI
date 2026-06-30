from typing import Any

from sqlalchemy import select

from app.models.attempt import Attempt
from app.models.review import Review
from app.repositories.attempt import AttemptRepository
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.schemas.attempt import (
    AttemptCreate,
    AttemptRead,
    AttemptUpdate,
    BatchWithTasks,
    TaskWithStatus,
    UserTaskSummary,
)
from app.services.base_service import BaseService


def _compute_status(trigger: dict[str, Any]) -> str | None:
    action = trigger.get("action")
    if action == "submit":
        if trigger.get("details", {}).get("correct") is True:
            return "completed"
        if trigger.get("details", {}).get("correct") is False:
            return "failed"
    if action == "give_up":
        return "abandoned"
    if action == "resume":
        return "in_progress"
    return None


STATUS_PRIORITY: dict[str, int] = {
    "completed": 3,
    "failed": 2,
    "abandoned": 1,
    "in_progress": 0,
}

_STATUS_ORDER = ["completed", "failed", "abandoned", "in_progress"]


def compute_attempt_status(events: list[Any]) -> dict[int, str]:
    """Compute attempt status from events in temporal order.
    `resume` after `abandon` overrides to `in_progress`.
    """
    status_map: dict[int, str] = {}
    for ev in sorted(events, key=lambda e: e.timestamp if e.timestamp else 0):
        aid = ev.attempt_id
        if aid is None:
            continue
        s = _compute_status(ev.trigger)
        if s is None:
            continue
        current = status_map.get(aid)
        new_score = STATUS_PRIORITY.get(s, 0)
        if current is None or new_score >= STATUS_PRIORITY.get(current, 0):
            status_map[aid] = s
    return status_map


class AttemptService(
    BaseService[Attempt, AttemptCreate, AttemptUpdate, AttemptRead]
):
    repository: AttemptRepository
    read_schema = AttemptRead

    async def get_by_user_and_task(
        self, user_id: int, task_id: str
    ) -> list[AttemptRead]:
        instances = await self.repository.get_by_user_and_task(
            user_id, task_id
        )
        attempt_ids = [inst.id for inst in instances if inst.id is not None]
        event_repo = EventRepository(db_session=self.repository.db_session)
        if attempt_ids:
            all_events = await event_repo.get_by_user_and_task(
                user_id, task_id
            )
            status_map = compute_attempt_status(all_events)
        else:
            status_map = {}

        result = []
        for inst in instances:
            dto = self.read_schema.model_validate(inst)
            if inst.id is not None and inst.id in status_map:
                dto.status = status_map[inst.id]
            result.append(dto)
        return result

    async def get_resumable_attempt(
        self, user_id: int, task_id: str
    ) -> AttemptRead | None:
        """Return the most recent attempt that can be resumed.
        Only non-terminal attempts that have reached the solver phase
        (have non-pre-solver events) are resumable.
        """
        attempts = await self.get_by_user_and_task(user_id, task_id)
        resumable: list[AttemptRead] = []
        event_repo = EventRepository(db_session=self.repository.db_session)
        for a in attempts:
            if a.status not in ("in_progress", "failed", None):
                continue
            if a.id is None:
                continue
            if await event_repo.has_solver_events(a.id):
                resumable.append(a)
        if not resumable:
            return None
        return max(resumable, key=lambda a: a.updated_at or a.created_at or a.id)

    async def get_user_tasks(
        self, user_id: int
    ) -> list[UserTaskSummary]:
        rows = await self.repository.get_user_tasks(user_id)
        return [UserTaskSummary.model_validate(row) for row in rows]

    async def get_user_batch_tasks(
        self, user_id: int
    ) -> list[BatchWithTasks]:
        batch_repo = BatchRepository(db_session=self.repository.db_session)
        batches = await batch_repo.get_batches_for_user(user_id)

        existing = await self.get_user_tasks(user_id)
        existing_map = {t.task_id: t for t in existing}

        from sqlalchemy.orm import selectinload


        review_query = (
            select(Review)
            .where(Review.solver_id == user_id)
            .options(selectinload(Review.reviewer))
        )
        review_result = await self.repository.db_session.execute(
            review_query
        )
        reviews = list(review_result.scalars().all())
        review_map: dict[str, list[str]] = {}
        for r in reviews:
            if r.task_id not in review_map:
                review_map[r.task_id] = []
            review_map[r.task_id].append(r.reviewer.email if r.reviewer else "Unknown")

        result = []
        for batch in batches:
            tasks = []
            for task_id in batch.task_ids:
                tid = str(task_id)
                summary = existing_map.get(tid)
                reviewer_emails = review_map.get(tid, [])
                if summary:
                    tasks.append(TaskWithStatus(
                        task_id=tid,
                        attempt_count=summary.attempt_count,
                        solved=summary.solved,
                        status="completed" if summary.solved else "started",
                        reviewed=len(reviewer_emails) > 0,
                        reviewer_emails=reviewer_emails,
                    ))
                else:
                    tasks.append(TaskWithStatus(
                        task_id=tid,
                        attempt_count=0,
                        solved=False,
                        status="not_started",
                        reviewed=len(reviewer_emails) > 0,
                        reviewer_emails=reviewer_emails,
                    ))
            result.append(BatchWithTasks(
                batch_id=batch.id,
                batch_name=batch.name,
                tasks=tasks,
            ))
        return result

    async def delete_user_task(self, user_id: int, task_id: str) -> None:
        await self.repository.delete_by_user_and_task(user_id, task_id)

    async def delete(self, attempt_id: int) -> None:
        await self.repository.delete_by_id(attempt_id)
