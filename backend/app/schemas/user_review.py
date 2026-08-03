from app.types.base import BaseAPISchema


class UserReviewRead(BaseAPISchema):
    user_id: int
    synth_task_id: str
    status: str = "pending_review"
    correct: bool | None = None
    verified: bool = False
    notes: list[str] = []


class UserReviewUpdate(BaseAPISchema):
    status: str | None = None
    correct: bool | None = None
    verified: bool | None = None
    notes: list[str] | None = None


class ReviewEntryProgress(BaseAPISchema):
    entry_id: str
    synth_task_ids: list[str] = []
    total: int = 0
    done: int = 0
    needs_revision: int = 0
    pending: int = 0
    status: str = "pending_review"


class SolverReviewVariant(BaseAPISchema):
    synth_task_id: str
    status: str = "pending_review"
    correct: bool | None = None
    verified: bool = False
    notes: list[str] = []


class SolverReviewDetail(BaseAPISchema):
    user_id: int
    email: str
    original_hypothesis: str | None = None
    revised_hypothesis: str | None = None
    variants: list[SolverReviewVariant] = []


class ReviewBatchTask(BaseAPISchema):
    entry_id: str
    total: int = 0
    done: int = 0
    needs_revision: int = 0
    pending: int = 0
    status: str = "pending_review"


class ReviewBatchWithTasks(BaseAPISchema):
    batch_id: int
    batch_name: str
    tasks: list[ReviewBatchTask] = []
