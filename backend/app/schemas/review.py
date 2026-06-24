from datetime import datetime

from app.types.base import BaseAPISchema


class PeerReviewPairCreate(BaseAPISchema):
    solver_a_id: int
    solver_b_id: int


class PeerReviewPairRead(BaseAPISchema):
    id: int
    solver_a_id: int
    solver_b_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReviewCreate(BaseAPISchema):
    reviewer_id: int
    solver_id: int
    task_id: str


class ReviewUpdate(BaseAPISchema):
    status: str | None = None


class ReviewRead(BaseAPISchema):
    id: int
    reviewer_id: int
    solver_id: int
    task_id: str
    status: str
    tag_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReviewSolverRead(BaseAPISchema):
    id: int
    reviewer_id: int
    task_id: str
    status: str
    tag_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReviewTagCreate(BaseAPISchema):
    solver_node_id: str
    quality: str


class ReviewTagRead(BaseAPISchema):
    id: int
    review_id: int
    solver_node_id: str
    quality: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReviewTaskSummary(BaseAPISchema):
    task_id: str
    solver_id: int
    attempt_count: int
    solved: bool
    status: str
