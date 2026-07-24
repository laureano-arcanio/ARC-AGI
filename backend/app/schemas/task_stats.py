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


class TaskSearchPaginated(BaseAPISchema):
    items: list[TaskSearchRead]
    total: int
    page: int
    per_page: int
    total_pages: int


class TaskSolverRead(BaseAPISchema):
    user_id: int
    email: str
