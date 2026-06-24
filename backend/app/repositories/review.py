from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.errors import ObjectNotFoundError
from app.models.review import PeerReviewPair, Review, ReviewTag
from app.repositories.base_repository import BaseRepository


class PeerReviewPairRepository(BaseRepository[PeerReviewPair]):
    model = PeerReviewPair

    list_options = [
        selectinload(PeerReviewPair.solver_a),
        selectinload(PeerReviewPair.solver_b),
    ]
    detail_options = [
        selectinload(PeerReviewPair.solver_a),
        selectinload(PeerReviewPair.solver_b),
    ]

    async def get_paired_solver_ids(self, user_id: int) -> list[int]:
        query = select(PeerReviewPair).where(
            (PeerReviewPair.solver_a_id == user_id)
            | (PeerReviewPair.solver_b_id == user_id)
        )
        result = await self.db_session.execute(query)
        pairs = list(result.scalars().all())
        ids: set[int] = set()
        for p in pairs:
            if p.solver_a_id == user_id:
                ids.add(p.solver_b_id)
            if p.solver_b_id == user_id:
                ids.add(p.solver_a_id)
        return list(ids)


class ReviewRepository(BaseRepository[Review]):
    model = Review

    detail_options = [selectinload(Review.tags)]

    async def get_by_reviewer_solver_task(
        self, reviewer_id: int, solver_id: int, task_id: str
    ) -> Review | None:
        query = (
            select(Review)
            .where(
                Review.reviewer_id == reviewer_id,
                Review.solver_id == solver_id,
                Review.task_id == task_id,
            )
            .options(selectinload(Review.tags))
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_solver_and_task(
        self, solver_id: int, task_id: str
    ) -> list[Review]:
        query = (
            select(Review)
            .where(Review.solver_id == solver_id, Review.task_id == task_id)
            .options(selectinload(Review.tags))
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def get_for_reviewer(self, reviewer_id: int) -> list[Review]:
        query = (
            select(Review)
            .where(Review.reviewer_id == reviewer_id)
            .options(selectinload(Review.tags))
            .order_by(Review.updated_at.desc())
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())


class ReviewTagRepository(BaseRepository[ReviewTag]):
    model = ReviewTag

    detail_options = []
    list_options = []

    async def get_by_review(self, review_id: int) -> list[ReviewTag]:
        query = (
            select(ReviewTag)
            .where(ReviewTag.review_id == review_id)
            .order_by(ReviewTag.created_at)
        )
        result = await self.db_session.execute(query)
        return list(result.scalars().all())

    async def delete_by_review_and_solver_node(
        self, review_id: int, solver_node_id: str
    ) -> None:
        query = select(ReviewTag).where(
            ReviewTag.review_id == review_id,
            ReviewTag.solver_node_id == solver_node_id,
        )
        result = await self.db_session.execute(query)
        instance = result.scalar_one_or_none()
        if not instance:
            raise ObjectNotFoundError(
                object_type="ReviewTag",
                object_id=f"review={review_id},node={solver_node_id}",
            )
        await self.db_session.delete(instance)
        await self.db_session.flush()
