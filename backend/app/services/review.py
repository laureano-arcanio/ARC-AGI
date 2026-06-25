import time

from fastapi import HTTPException, status

from app.models.review import PeerReviewPair, Review, ReviewTag
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.review import (
    PeerReviewPairRepository,
    ReviewRepository,
    ReviewTagRepository,
)
from app.schemas.review import (
    PeerReviewPairCreate,
    PeerReviewPairRead,
    ReviewCreate,
    ReviewRead,
    ReviewTagCreate,
    ReviewTagRead,
    ReviewTaskSummary,
    ReviewUpdate,
)
from app.services.base_service import BaseService


class PeerReviewPairService(
    BaseService[
        PeerReviewPair,
        PeerReviewPairCreate,
        PeerReviewPairCreate,
        PeerReviewPairRead,
    ]
):
    repository: PeerReviewPairRepository
    read_schema = PeerReviewPairRead

    async def get_paired_solver_ids(self, user_id: int) -> list[int]:
        return await self.repository.get_paired_solver_ids(user_id)

    async def get_all_with_users(self) -> list[PeerReviewPairRead]:
        instances = await self.repository.get_all()
        return [self.read_schema.model_validate(inst) for inst in instances]


class ReviewService(
    BaseService[Review, ReviewCreate, ReviewUpdate, ReviewRead]
):
    repository: ReviewRepository
    read_schema = ReviewRead

    async def get_or_create(
        self,
        reviewer_id: int,
        solver_id: int,
        task_id: str,
        is_admin: bool = False,
    ) -> ReviewRead:
        existing = await self.repository.get_by_reviewer_solver_task(
            reviewer_id, solver_id, task_id
        )
        if existing:
            return self.read_schema.model_validate(existing)
        if not is_admin:
            await self._validate_review_target(reviewer_id, solver_id, task_id)
        data = ReviewCreate(
            reviewer_id=reviewer_id, solver_id=solver_id, task_id=task_id
        )
        instance = await self.repository.create(data.model_dump())
        return self.read_schema.model_validate(instance)

    async def _validate_review_target(
        self, reviewer_id: int, solver_id: int, task_id: str
    ) -> None:
        """A review may only target a paired solver on a task that solver was
        actually assigned."""
        pair_repo = PeerReviewPairRepository(
            db_session=self.repository.db_session
        )
        paired_ids = await pair_repo.get_paired_solver_ids(reviewer_id)
        if solver_id not in paired_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Reviewer is not paired with this solver",
            )
        batch_repo = BatchRepository(db_session=self.repository.db_session)
        if not await batch_repo.user_has_access(solver_id, task_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solver is not assigned to this task",
            )

    async def get_by_id(self, id: int) -> ReviewRead:
        instance = await self.repository.get_by_id(id)
        return self._to_read(instance)

    def _to_read(self, instance: Review) -> ReviewRead:
        data = {
            "id": instance.id,
            "reviewer_id": instance.reviewer_id,
            "solver_id": instance.solver_id,
            "task_id": instance.task_id,
            "status": instance.status,
            "tag_count": len(instance.tags) if instance.tags else 0,
            "created_at": instance.created_at,
            "updated_at": instance.updated_at,
        }
        return ReviewRead.model_validate(data)

    async def update(
        self, id: int, data: ReviewUpdate
    ) -> ReviewRead:
        instance = await self.repository.update(
            id, data.model_dump(exclude_unset=True)
        )
        return self._to_read(instance)

    async def get_pending_reviews(
        self, reviewer_id: int
    ) -> list[ReviewTaskSummary]:
        pair_repo = PeerReviewPairRepository(
            db_session=self.repository.db_session
        )
        paired_ids = await pair_repo.get_paired_solver_ids(reviewer_id)
        if not paired_ids:
            return []

        batch_repo = BatchRepository(db_session=self.repository.db_session)

        result: list[ReviewTaskSummary] = []
        for solver_id in paired_ids:
            batches = await batch_repo.get_batches_for_user(solver_id)
            task_ids: set[str] = set()
            for batch in batches:
                for tid in batch.task_ids:
                    task_ids.add(str(tid))

            existing_reviews = await self.repository.get_for_reviewer(
                reviewer_id
            )
            reviewed_task_ids = {
                r.task_id for r in existing_reviews
                if r.solver_id == solver_id and r.status == "completed"
            }

            for task_id in sorted(task_ids):
                if task_id in reviewed_task_ids:
                    continue
                result.append(
                    ReviewTaskSummary(
                        task_id=task_id,
                        solver_id=solver_id,
                        attempt_count=0,
                        solved=False,
                        status="not_started",
                    )
                )
        return result

    async def get_review_by_solver_and_task(
        self, solver_id: int, task_id: str
    ) -> list[ReviewRead]:
        instances = await self.repository.get_by_solver_and_task(
            solver_id, task_id
        )
        return [self._to_read(inst) for inst in instances]


class ReviewTagService(
    BaseService[ReviewTag, ReviewTagCreate, ReviewTagCreate, ReviewTagRead]
):
    repository: ReviewTagRepository
    read_schema = ReviewTagRead

    async def get_by_review(self, review_id: int) -> list[ReviewTagRead]:
        instances = await self.repository.get_by_review(review_id)
        return [self.read_schema.model_validate(inst) for inst in instances]

    async def create_tag(
        self,
        review_id: int,
        data: ReviewTagCreate,
        reviewer_id: int,
        solver_id: int,
        task_id: str,
    ) -> ReviewTagRead:
        event_repo = EventRepository(db_session=self.repository.db_session)

        # The tagged node must be a real cognitive node from the reviewed
        # solver's stored events for this task.
        solver_events = await event_repo.get_by_user_and_task(
            solver_id, task_id
        )
        if data.solver_node_id not in {ev.node_id for ev in solver_events}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="solver_node_id is not a node of the reviewed solver",
            )

        # One quality label per solver node per review: changing quality
        # updates the existing tag rather than creating a duplicate.
        existing = await self.repository.get_by_review_and_solver_node(
            review_id, data.solver_node_id
        )
        if existing is not None:
            instance = await self.repository.update(
                existing.id, {"quality": data.quality}
            )
        else:
            tag_data = data.model_dump()
            tag_data["review_id"] = review_id
            instance = await self.repository.create(tag_data)

        await event_repo.create(
            {
                "user_id": reviewer_id,
                "task_id": task_id,
                "attempt_id": None,
                "node_id": f"review_tag_{instance.id}",
                "parent_node_id": data.solver_node_id,
                "test_pair_index": None,
                "trigger": {
                    "kind": "review_tag",
                    "quality": data.quality,
                },
                "state_snapshot": [],
                "timestamp": int(time.time() * 1000),
            }
        )
        return self.read_schema.model_validate(instance)

    async def delete_tag(self, review_id: int, tag_id: int) -> None:
        tag = await self.repository.get_by_id(tag_id)
        if tag.review_id != review_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag does not belong to this review",
            )
        await self.repository.delete(tag_id)
