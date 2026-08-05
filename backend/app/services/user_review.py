import asyncio

from app.errors import ObjectNotFoundError
from app.models.user_review import UserReview
from app.repositories.batch import BatchRepository
from app.repositories.event import EventRepository
from app.repositories.user import UserRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.user_review import (
    ReviewBatchTask,
    ReviewBatchWithTasks,
    ReviewEntryProgress,
    SolverReviewDetail,
    SolverReviewVariant,
    UserReviewRead,
    UserReviewUpdate,
)
from app.services.base_service import BaseService
from app.services.synthetic_task import SyntheticTaskService, _get_cached_index


def _review_duration_seconds(instance: UserReview) -> int | None:
    """Seconds from started_at to the end of the review session.

    End is finished_at when the review reached a terminal status, otherwise
    the last update as a best-effort close."""
    if instance.started_at is None:
        return None
    end = instance.finished_at or instance.updated_at
    if end is None:
        return None
    duration = (end - instance.started_at).total_seconds()
    return max(0, int(duration))


def _resolve_original_ids(entry_ids: list[str]) -> dict[str, str]:
    idx = _get_cached_index()
    result: dict[str, str] = {}
    for eid in entry_ids:
        t = idx._by_id.get(eid)
        oid = t.get("original_task_id", eid) if t else eid
        result[eid] = oid
    return result


async def _get_solved_for_entries(
    event_repository: EventRepository | None,
    user_id: int,
    entry_ids: list[str],
    original_ids: dict[str, str],
) -> dict[str, bool]:
    if event_repository is None:
        return {}
    unique_originals = list({oid for oid in original_ids.values()})
    if not unique_originals:
        return {}
    solved_originals = await event_repository.get_solved_task_ids(
        user_id, unique_originals
    )
    return {eid: original_ids[eid] in solved_originals for eid in entry_ids}


class UserReviewService(
    BaseService[UserReview, UserReviewUpdate, UserReviewUpdate, UserReviewRead]
):
    repository: UserReviewRepository
    read_schema = UserReviewRead

    def __init__(
        self,
        repository: UserReviewRepository,
        batch_repository: BatchRepository,
        user_repository: UserRepository | None = None,
        event_repository: EventRepository | None = None,
    ):
        super().__init__(repository)
        self.batch_repository = batch_repository
        self.user_repository = user_repository
        self.event_repository = event_repository

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
            selected_pairs=list(instance.selected_pairs or []),
            started_at=instance.started_at,
            finished_at=instance.finished_at,
            duration_seconds=_review_duration_seconds(instance),
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

    async def get_admin_review(
        self, admin_user_id: int, synth_task_id: str
    ) -> UserReviewRead:
        """Admin's own review for a synthetic task (no batch access needed)."""
        try:
            instance = await self.repository.get_by_user_and_task(
                admin_user_id, synth_task_id
            )
        except ObjectNotFoundError:
            return UserReviewRead(
                user_id=admin_user_id, synth_task_id=synth_task_id
            )
        return self._to_read(instance)

    async def update_admin_review(
        self,
        admin_user_id: int,
        synth_task_id: str,
        data: UserReviewUpdate,
    ) -> UserReviewRead:
        """Admin acts as a reviewer on any synthetic task (no batch access)."""
        instance = await self.repository.upsert(
            admin_user_id, synth_task_id, data.model_dump(exclude_unset=True)
        )
        return self._to_read(instance)

    async def start_review(
        self, user_id: int, synth_task_id: str
    ) -> UserReviewRead:
        await self._ensure_access(user_id, synth_task_id)
        instance = await self.repository.start_review(user_id, synth_task_id)
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

    async def get_user_review_batches(
        self, user_id: int
    ) -> list[ReviewBatchWithTasks]:
        batches = await self.batch_repository.get_batches_for_user(
            user_id, batch_type="review"
        )
        if not batches:
            return []
        all_entry_ids: list[str] = []
        for batch in batches:
            for tid in batch.task_ids:
                all_entry_ids.append(str(tid))
        if not all_entry_ids:
            return []
        progress = await self.list_progress(
            user_id, all_entry_ids, allowed_ids=set(all_entry_ids)
        )
        progress_by_entry = {p.entry_id: p for p in progress}
        result: list[ReviewBatchWithTasks] = []
        for batch in batches:
            tasks: list[ReviewBatchTask] = []
            for task_id in batch.task_ids:
                tid = str(task_id)
                p = progress_by_entry.get(tid)
                tasks.append(ReviewBatchTask(
                    entry_id=tid,
                    total=p.total if p else 0,
                    done=p.done if p else 0,
                    needs_revision=p.needs_revision if p else 0,
                    pending=p.pending if p else 0,
                    status=p.status if p else "pending_review",
                ))
            result.append(ReviewBatchWithTasks(
                batch_id=batch.id,
                batch_name=batch.name,
                tasks=tasks,
            ))
        return result

    async def list_progress(
        self, user_id: int, entry_ids: list[str], allowed_ids: set[str] | None = None
    ) -> list[ReviewEntryProgress]:
        if allowed_ids is None:
            allowed = set(await self.batch_repository.get_user_review_task_ids(user_id))
        else:
            allowed = allowed_ids
        requested = [eid for eid in entry_ids if eid in allowed]
        if not requested:
            return []
        entry_variants = SyntheticTaskService().resolve_entry_ids(requested)
        all_variant_ids = [
            vid for vids in entry_variants.values() for vid in vids
        ]
        instances = await self.repository.get_by_user_and_tasks(
            user_id, all_variant_ids
        )
        by_synth = {i.synth_task_id: self._to_read(i) for i in instances}

        original_task_ids = _resolve_original_ids(requested)
        solved = await _get_solved_for_entries(
            self.event_repository, user_id, requested, original_task_ids
        )

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
                    solved=solved.get(eid, False),
                )
            )
        return result

    async def get_solver_review_details(
        self, original_task_id: str
    ) -> list[SolverReviewDetail]:
        """Admin view: per-user review status over the synthetic variants of
        an original task, plus their first (original) and latest (revised)
        hypothesis recorded for that original task."""
        variants = SyntheticTaskService().resolve_entry(original_task_id)
        variant_ids = [v.id for v in variants]
        if not variant_ids:
            return []
        reviews = await self.repository.get_reviews_by_tasks(variant_ids)

        reviews_by_user: dict[int, list[UserReview]] = {}
        for review in reviews:
            reviews_by_user.setdefault(review.user_id, []).append(review)

        if not reviews_by_user:
            return []

        user_ids = list(reviews_by_user.keys())
        emails: dict[int, str] = {}
        hypothesis_texts: dict[int, list[str]] = {}

        async def _fetch_emails() -> dict[int, str]:
            if self.user_repository is not None:
                users = await self.user_repository.get_by_ids(user_ids)
                return {u.id: u.email for u in users}
            return {}

        async def _fetch_hypotheses() -> dict[int, list[str]]:
            if self.event_repository is not None:
                return await self.event_repository.get_hypothesis_texts_by_task(
                    original_task_id
                )
            return {}

        emails, hypothesis_texts = await asyncio.gather(
            _fetch_emails(), _fetch_hypotheses()
        )

        result: list[SolverReviewDetail] = []
        for user_id in sorted(reviews_by_user.keys()):
            user_reviews = reviews_by_user[user_id]
            user_reviews.sort(key=lambda r: r.synth_task_id)
            texts = hypothesis_texts.get(user_id, [])
            result.append(
                SolverReviewDetail(
                    user_id=user_id,
                    email=emails.get(user_id, ""),
                    original_hypothesis=texts[0] if texts else None,
                    revised_hypothesis=texts[-1] if texts else None,
                    variants=[
                        SolverReviewVariant(
                            synth_task_id=r.synth_task_id,
                            status=r.status or "pending_review",
                            correct=r.correct,
                            verified=bool(r.verified),
                            notes=list(r.notes or []),
                            selected_pairs=list(r.selected_pairs or []),
                            started_at=r.started_at,
                            finished_at=r.finished_at,
                            duration_seconds=_review_duration_seconds(r),
                        )
                        for r in user_reviews
                    ],
                )
            )
        return result
