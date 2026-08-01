from typing import Any

from app.types.base import BaseAPISchema


class SyntheticTaskRead(BaseAPISchema):
    id: str
    original_task_id: str
    model_name: str
    seed: int | None = None
    timestamp: str | None = None
    concept: str | None = None
    num_train: int = 8
    num_test: int = 2
    witness_passed: bool = False
    witness_n_passed: int | None = None
    witness_n_total: int | None = None
    review_status: str = "pending_review"
    correct: bool | None = None
    verified: bool = False
    hypothesis: str | None = None
    train: list[dict[str, Any]] = []
    test: list[dict[str, Any]] = []


class SyntheticTaskListRead(BaseAPISchema):
    items: list[SyntheticTaskRead]
    total: int
    page: int
    per_page: int
    total_pages: int


class SyntheticReviewRead(BaseAPISchema):
    synth_task_id: str
    status: str = "pending_review"
    correct: bool | None = None
    verified: bool = False
    notes: list[str] = []


class SyntheticReviewUpdate(BaseAPISchema):
    status: str | None = None
    correct: bool | None = None
    verified: bool | None = None
    notes: list[str] | None = None
