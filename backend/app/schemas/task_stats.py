from app.types.base import BaseAPISchema


class TaskStatsRead(BaseAPISchema):
    task_id: str
    complete_count: int
    incomplete_count: int
    abandoned_count: int
    width: int
    height: int


class TaskStatsPaginated(BaseAPISchema):
    items: list[TaskStatsRead]
    total: int
    page: int
    per_page: int
    total_pages: int


class SolverUserRead(BaseAPISchema):
    user_id: int
    email: str
    hypothesis: str | None = None


class TaskSearchRead(BaseAPISchema):
    task_id: str
    has_solution: bool
    solvers: list[SolverUserRead]
    solution_count: int
    width: int
    height: int
    same_size: bool
    width_delta: int | None
    height_delta: int | None
    transform_label: str
    all_inputs_same: bool
    all_outputs_same: bool
    datasets: list[str]


class TaskSearchPaginated(BaseAPISchema):
    items: list[TaskSearchRead]
    total: int
    page: int
    per_page: int
    total_pages: int


class TaskSolverRead(BaseAPISchema):
    user_id: int
    email: str
    hypothesis: str | None = None


class TaskSolverAnonRead(BaseAPISchema):
    hypothesis: str | None = None


class TaskReviewGroupUser(BaseAPISchema):
    distinct_reviewers: int = 0
    reviewed_variants: int = 0
    unreviewed_variants: int = 0
    variants_with_incorrect_mark: int = 0
    variants_with_correct_mark: int = 0
    incorrect_marks: int = 0
    correct_marks: int = 0
    reviewer_emails: list[str] = []


class TaskReviewGroupAdmin(BaseAPISchema):
    status: str = "unreviewed"
    reviewed_variants: int = 0
    done_variants: int = 0
    needs_revision_variants: int = 0
    pending_variants: int = 0
    verified_variants: int = 0
    correct_variants: int = 0
    incorrect_variants: int = 0


class TaskReviewGroupRead(BaseAPISchema):
    original_task_id: str
    datasets: list[str] = []
    solvers: list[SolverUserRead] = []
    solution_count: int = 0
    has_solution: bool = False
    width: int = 0
    height: int = 0
    same_size: bool = True
    width_delta: int | None = None
    height_delta: int | None = None
    transform_label: str = ""
    total_variants: int = 0
    witness_passed_count: int = 0
    witness_failed_count: int = 0
    models: list[str] = []
    concepts: list[str] = []
    first_variant_id: str = ""
    user_review: TaskReviewGroupUser = TaskReviewGroupUser()
    admin_review: TaskReviewGroupAdmin = TaskReviewGroupAdmin()


class TaskReviewGroupListRead(BaseAPISchema):
    items: list[TaskReviewGroupRead]
    total: int
    page: int
    per_page: int
    total_pages: int


class MyHypothesisRead(BaseAPISchema):
    hypothesis: str | None = None


class MyHypothesisUpdate(BaseAPISchema):
    hypothesis: str
