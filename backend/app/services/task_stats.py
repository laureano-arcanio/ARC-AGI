import math
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.task_stats import (
    SolverUserRead,
    TaskSearchPaginated,
    TaskSearchRead,
    TaskSolverRead,
    TaskStatsPaginated,
    TaskStatsRead,
)
from app.services.arc_task import SOURCES, ArcTaskService


class TaskStatsService:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self._arc_service = ArcTaskService()

    async def get_tasks_stats(
        self,
        page: int = 1,
        per_page: int = 100,
        user_id: int | None = None,
        min_width: int | None = None,
        max_width: int | None = None,
        min_height: int | None = None,
        max_height: int | None = None,
        min_solutions: int | None = None,
        max_solutions: int | None = None,
    ) -> TaskStatsPaginated:
        all_task_dims = self._load_all_task_dimensions()

        query_params: dict[str, Any] = {}
        user_clause = "1=1"
        if user_id is not None:
            user_clause = "e.user_id = :user_id"
            query_params["user_id"] = user_id

        sql = text(f"""
            WITH user_task_status AS (
                SELECT
                    e.user_id,
                    e.task_id,
                    MAX(CASE
                        WHEN e.trigger->>'action' = 'submit'
                         AND CAST(e.trigger->'details'->>'correct' AS BOOLEAN) = true
                        THEN 1 ELSE 0
                    END) AS is_solved,
                    MAX(CASE
                        WHEN e.trigger->>'action' IN ('give_up', 'abandon')
                        THEN 1 ELSE 0
                    END) AS is_abandoned
                FROM event e
                WHERE {user_clause}
                GROUP BY e.user_id, e.task_id
            )
            SELECT
                task_id,
                SUM(is_solved) AS complete_count,
                SUM(CASE WHEN is_solved = 0 AND is_abandoned = 1
                    THEN 1 ELSE 0 END) AS abandoned_count,
                SUM(CASE WHEN is_solved = 0 AND is_abandoned = 0
                    THEN 1 ELSE 0 END) AS incomplete_count
            FROM user_task_status
            GROUP BY task_id
        """)

        result = await self.db_session.execute(sql, query_params)
        db_counts: dict[str, dict[str, int]] = {}
        for row in result.all():
            db_counts[row[0]] = {
                "complete_count": row[1],
                "abandoned_count": row[2],
                "incomplete_count": row[3],
            }

        items: list[TaskStatsRead] = []
        for task_id, dims in all_task_dims.items():
            counts = db_counts.get(task_id, {
                "complete_count": 0,
                "abandoned_count": 0,
                "incomplete_count": 0,
            })

            width = dims["width"]
            height = dims["height"]
            total_solutions = (
                counts["complete_count"]
                + counts["incomplete_count"]
                + counts["abandoned_count"]
            )

            if min_width is not None and width < min_width:
                continue
            if max_width is not None and width > max_width:
                continue
            if min_height is not None and height < min_height:
                continue
            if max_height is not None and height > max_height:
                continue
            if min_solutions is not None and total_solutions < min_solutions:
                continue
            if max_solutions is not None and total_solutions > max_solutions:
                continue

            items.append(
                TaskStatsRead(
                    task_id=task_id,
                    complete_count=counts["complete_count"],
                    incomplete_count=counts["incomplete_count"],
                    abandoned_count=counts["abandoned_count"],
                    width=width,
                    height=height,
                )
            )

        items.sort(key=lambda x: x.task_id)

        total = len(items)
        total_pages = max(1, math.ceil(total / per_page))
        page = max(1, min(page, total_pages))

        start = (page - 1) * per_page
        end = start + per_page
        paged_items = items[start:end]

        return TaskStatsPaginated(
            items=paged_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    async def search_tasks(
        self,
        page: int = 1,
        per_page: int = 100,
        min_width: int | None = None,
        max_width: int | None = None,
        min_height: int | None = None,
        max_height: int | None = None,
        min_solutions: int | None = None,
        max_solutions: int | None = None,
        same_size: bool | None = None,
        min_width_delta: int | None = None,
        max_width_delta: int | None = None,
        min_height_delta: int | None = None,
        max_height_delta: int | None = None,
        all_inputs_same: bool | None = None,
        all_outputs_same: bool | None = None,
    ) -> TaskSearchPaginated:
        all_task_dims = self._load_all_task_dimensions()
        all_transform = self._load_all_transform_info()

        sql = text("""
            SELECT
                e.task_id,
                COUNT(DISTINCT e.user_id) AS solver_count,
                ARRAY_AGG(DISTINCT u.email) AS solver_emails,
                ARRAY_AGG(DISTINCT u.id) AS solver_ids
            FROM event e
            JOIN "user" u ON u.id = e.user_id
            WHERE
                e.trigger->>'action' = 'submit'
                AND CAST(e.trigger->'details'->>'correct' AS BOOLEAN) = true
            GROUP BY e.task_id
        """)

        result = await self.db_session.execute(sql)
        db_data: dict[str, tuple[int, list[str], list[int]]] = {}
        for row in result.all():
            task_id = row[0]
            solver_count = row[1]
            emails_raw = list(row[2]) if row[2] else []
            user_ids_raw = list(row[3]) if row[3] else []
            combined = sorted(
                zip(emails_raw, user_ids_raw, strict=False), key=lambda x: x[0]
            )
            emails = [e for e, _ in combined]
            user_ids = [uid for _, uid in combined]
            db_data[task_id] = (solver_count, emails, user_ids)

        items: list[TaskSearchRead] = []
        for task_id, dims in all_task_dims.items():
            solver_count, solver_emails, solver_ids = db_data.get(task_id, (0, [], []))
            width = dims["width"]
            height = dims["height"]
            ti = all_transform.get(task_id, {
                "same_size": True, "width_delta": 0,
                "height_delta": 0, "label": "same_size",
            })

            if min_width is not None and width < min_width:
                continue
            if max_width is not None and width > max_width:
                continue
            if min_height is not None and height < min_height:
                continue
            if max_height is not None and height > max_height:
                continue
            if min_solutions is not None and solver_count < min_solutions:
                continue
            if max_solutions is not None and solver_count > max_solutions:
                continue
            if same_size is not None and ti["same_size"] != same_size:
                continue
            ais = all_inputs_same
            if ais is not None and ti.get("all_inputs_same") != ais:
                continue
            aos = all_outputs_same
            if aos is not None and ti.get("all_outputs_same") != aos:
                continue
            wd = ti["width_delta"]
            hd = ti["height_delta"]
            if wd is not None:
                if min_width_delta is not None and wd < min_width_delta:
                    continue
                if max_width_delta is not None and wd > max_width_delta:
                    continue
            if hd is not None:
                if min_height_delta is not None and hd < min_height_delta:
                    continue
                if max_height_delta is not None and hd > max_height_delta:
                    continue

            solvers = [
                SolverUserRead(user_id=uid, email=em)
                for uid, em in zip(solver_ids, solver_emails, strict=False)
            ]
            items.append(
                TaskSearchRead(
                    task_id=task_id,
                    has_solution=solver_count > 0,
                    solvers=solvers,
                    solution_count=solver_count,
                    width=width,
                    height=height,
                    same_size=ti["same_size"],
                    width_delta=wd,
                    height_delta=hd,
                    transform_label=ti["label"],
                    all_inputs_same=ti.get("all_inputs_same", True),
                    all_outputs_same=ti.get("all_outputs_same", True),
                )
            )

        items.sort(key=lambda x: x.task_id)

        total = len(items)
        total_pages = max(1, math.ceil(total / per_page))
        page = max(1, min(page, total_pages))

        start = (page - 1) * per_page
        end = start + per_page
        paged_items = items[start:end]

        return TaskSearchPaginated(
            items=paged_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    async def get_task_solvers(self, task_id: str) -> list[TaskSolverRead]:
        sql = text("""
            SELECT DISTINCT
                u.id,
                u.email
            FROM event e
            JOIN "user" u ON u.id = e.user_id
            WHERE
                e.task_id = :task_id
                AND e.trigger->>'action' = 'submit'
                AND CAST(e.trigger->'details'->>'correct' AS BOOLEAN) = true
            ORDER BY u.email
        """)
        result = await self.db_session.execute(sql, {"task_id": task_id})
        return [TaskSolverRead(user_id=row[0], email=row[1]) for row in result.all()]

    def _load_all_transform_info(self) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for challenges_file, _solutions_file in SOURCES:
            challenges = self._arc_service._load_json(challenges_file)
            for task_id, task_data in challenges.items():
                train = task_data.get("train", [])
                if not train:
                    result[task_id] = {
                        "same_size": True,
                        "width_delta": None,
                        "height_delta": None,
                        "label": "no_train",
                        "all_inputs_same": True,
                        "all_outputs_same": True,
                    }
                    continue
                deltas: list[tuple[int, int]] = []
                input_sizes: list[tuple[int, int]] = []
                output_sizes: list[tuple[int, int]] = []
                for pair in train:
                    inp = pair.get("input", [])
                    out = pair.get("output", [])
                    if not inp or not out:
                        continue
                    ih, iw = len(inp), len(inp[0]) if inp[0] else 0
                    oh, ow = len(out), len(out[0]) if out[0] else 0
                    deltas.append((ow - iw, oh - ih))
                    input_sizes.append((ih, iw))
                    output_sizes.append((oh, ow))
                if not deltas:
                    result[task_id] = {
                        "same_size": True,
                        "width_delta": None,
                        "height_delta": None,
                        "label": "no_train",
                        "all_inputs_same": True,
                        "all_outputs_same": True,
                    }
                    continue
                first_dw, first_dh = deltas[0]
                all_same = all(d == (first_dw, first_dh) for d in deltas)
                same_size = all(d == (0, 0) for d in deltas)
                all_inputs_same = all(s == input_sizes[0] for s in input_sizes)
                all_outputs_same = all(s == output_sizes[0] for s in output_sizes)
                if same_size:
                    result[task_id] = {
                        "same_size": True,
                        "width_delta": 0,
                        "height_delta": 0,
                        "label": "same_size",
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                    }
                elif all_same:
                    dw, dh = first_dw, first_dh
                    if dw > 0 and dh > 0:
                        label = "expand_both"
                    elif dw < 0 and dh < 0:
                        label = "shrink_both"
                    elif dw > 0 and dh == 0:
                        label = "expand_w"
                    elif dw < 0 and dh == 0:
                        label = "shrink_w"
                    elif dw == 0 and dh > 0:
                        label = "expand_h"
                    elif dw == 0 and dh < 0:
                        label = "shrink_h"
                    elif dw > 0:
                        label = "expand_w_more"
                    elif dw < 0:
                        label = "shrink_w_more"
                    else:
                        label = "resize"
                    result[task_id] = {
                        "same_size": False,
                        "width_delta": dw,
                        "height_delta": dh,
                        "label": label,
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                    }
                else:
                    widths = set(d[0] for d in deltas)
                    heights = set(d[1] for d in deltas)
                    mixed_label = "mixed"
                    if len(widths) == 1:
                        h_min = min(d[1] for d in deltas)
                        h_max = max(d[1] for d in deltas)
                        mixed_label = f"mixed_h_{h_min}_{h_max}"
                    elif len(heights) == 1:
                        w_min = min(d[0] for d in deltas)
                        w_max = max(d[0] for d in deltas)
                        mixed_label = f"mixed_w_{w_min}_{w_max}"
                    result[task_id] = {
                        "same_size": False,
                        "width_delta": None,
                        "height_delta": None,
                        "label": mixed_label,
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                    }
        return result

    def _load_all_task_dimensions(self) -> dict[str, dict[str, int]]:
        dims: dict[str, dict[str, int]] = {}

        for challenges_file, _solutions_file in SOURCES:
            challenges = self._arc_service._load_json(challenges_file)
            for task_id, task_data in challenges.items():
                width, height = self._first_grid_dims(task_data)
                dims[task_id] = {"width": width, "height": height}

        return dims

    def _first_grid_dims(self, task_data: dict[str, Any]) -> tuple[int, int]:
        train = task_data.get("train", [])
        if train and len(train) > 0:
            first_input = train[0].get("input", [])
            if first_input:
                height = len(first_input)
                width = len(first_input[0]) if height > 0 else 0
                return width, height

        test = task_data.get("test", [])
        if test and len(test) > 0:
            first_input = test[0].get("input", [])
            if first_input:
                height = len(first_input)
                width = len(first_input[0]) if height > 0 else 0
                return width, height

        return 0, 0
