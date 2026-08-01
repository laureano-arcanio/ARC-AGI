from app.errors import ObjectNotFoundError
from app.models.user_review import UserReview
from app.repositories.batch import BatchRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.user_review import (
    ReviewEntryProgress,
    UserReviewRead,
    UserReviewUpdate,
)
from app.services.base_service import BaseService
from app.services.synthetic_task import SyntheticTaskService


class UserReviewService(
    BaseService[UserReview, UserReviewUpdate, UserReviewUpdate, UserReviewRead]
):
    repository: UserReviewRepository
    read_schema = UserReviewRead

    def __init__(
        self,
        repository: UserReviewRepository,
        batch_repository: BatchRepository,
    ):
        super().__init__(repository)
        self.batch_repository = batch_repository

    async def _ensure_access(self, user_id: int, synth_task_id: str) -> None:
        review_task_ids = await self.batch_repository.get_user_review_task_ids(
            user_id
        )
        if not SyntheticTaskService.user_has_variant_access(
            review_task_ids, synth_task_id
        ):
            raise ObjectNotFoundError(
                object_type="UserReview", object_id=synth_task_id
            )

    @staticmethod
    def _to_read(instance: UserReview) -> UserReviewRead:
        return UserReviewRead(
            user_id=instance.user_id,
            synth_task_id=instance.synth_task_id,
            status=instance.status or "pending_review",
            correct=instance.correct,
            verified=bool(instance.verified),
            notes=list(instance.notes or []),
        )

    async def get_review(
        self, user_id: int, synth_task_id: str
    ) -> UserReviewRead:
        await self._ensure_access(user_id, synth_task_id)
        try:
            instance = await self.repository.get_by_user_and_task(
                user_id, synth_task_id
            )
        except ObjectNotFoundError:
            return UserReviewRead(
                user_id=user_id, synth_task_id=synth_task_id
            )
        return self._to_read(instance)

    async def update_review(
        self,
        user_id: int,
        synth_task_id: str,
        data: UserReviewUpdate,
    ) -> UserReviewRead:
        await self._ensure_access(user_id, synth_task_id)
        instance = await self.repository.upsert(
            user_id, synth_task_id, data.model_dump(exclude_unset=True)
        )
        return self._to_read(instance)

    async def list_for_user_tasks(
        self, user_id: int, synth_task_ids: list[str]
    ) -> list[UserReviewRead]:
        allowed = set(await self.batch_repository.get_user_review_task_ids(user_id))
        requested = [tid for tid in synth_task_ids if tid in allowed]
        instances = await self.repository.get_by_user_and_tasks(user_id, requested)
        existing = {i.synth_task_id: self._to_read(i) for i in instances}
        result: list[UserReviewRead] = []
        for tid in requested:
            if tid in existing:
                result.append(existing[tid])
            else:
                result.append(
                    UserReviewRead(user_id=user_id, synth_task_id=tid)
                )
        return result

    async def list_progress(
        self, user_id: int, entry_ids: list[str]
    ) -> list[ReviewEntryProgress]:
        allowed = set(await self.batch_repository.get_user_review_task_ids(user_id))
        requested = [eid for eid in entry_ids if eid in allowed]
        if not requested:
            return []
        entry_variants: dict[str, list[str]] = {}
        for eid in requested:
            entry_variants[eid] = [
                task.id for task in SyntheticTaskService().resolve_entry(eid)
            ]
        all_variant_ids = [
            vid for vids in entry_variants.values() for vid in vids
        ]
        instances = await self.repository.get_by_user_and_tasks(
            user_id, all_variant_ids
        )
        by_synth = {i.synth_task_id: self._to_read(i) for i in instances}

        result: list[ReviewEntryProgress] = []
        for eid in requested:
            vids = entry_variants[eid]
            statuses = [
                by_synth[vid].status if vid in by_synth else "pending_review"
                for vid in vids
            ]
            done = sum(1 for s in statuses if s == "done")
            needs_revision = sum(
                1 for s in statuses if s == "needs_revision"
            )
            pending = len(statuses) - done - needs_revision
            if vids and done == len(vids):
                status = "done"
            elif needs_revision > 0:
                status = "needs_revision"
            else:
                status = "pending_review"
            result.append(
                ReviewEntryProgress(
                    entry_id=eid,
                    synth_task_ids=vids,
                    total=len(vids),
                    done=done,
                    needs_revision=needs_revision,
                    pending=pending,
                    status=status,
                )
            )
        return result
