import math
import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_review import UserReview
from app.repositories.event import EventRepository
from app.repositories.user_review import UserReviewRepository
from app.schemas.task_stats import (
    SolverUserRead,
    TaskReviewGroupAdmin,
    TaskReviewGroupListRead,
    TaskReviewGroupRead,
    TaskReviewGroupUser,
    TaskSearchPaginated,
    TaskSearchRead,
    TaskSolverAnonRead,
    TaskSolverRead,
    TaskStatsPaginated,
    TaskStatsRead,
)
from app.services.arc_task import SOURCES, ArcTaskService
from app.services.synthetic_task import _get_cached_index


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
        solver_email: str | None = None,
        hypothesis_text: str | None = None,
        task_id_filter: str | None = None,
        dataset: str | None = None,
        has_tags: str | None = None,
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

        hypothesis_task_ids: set[str] | None = None
        if hypothesis_text:
            h_sql = text("""
                SELECT DISTINCT task_id
                FROM event
                WHERE trigger->>'kind' = 'cognitive'
                  AND trigger->>'text' ILIKE :pattern
            """)
            h_result = await self.db_session.execute(
                h_sql, {"pattern": f"%{hypothesis_text}%"}
            )
            hypothesis_task_ids = {row[0] for row in h_result.all()}

        h_all_sql = text("""
            SELECT DISTINCT ON (task_id, user_id)
                task_id,
                user_id,
                trigger->>'text' AS text
            FROM event
            WHERE trigger->>'kind' = 'cognitive'
              AND trigger->>'text' IS NOT NULL
            ORDER BY task_id, user_id, id DESC
        """)
        h_all_result = await self.db_session.execute(h_all_sql)
        task_solver_hypotheses: dict[str, dict[int, str]] = {}
        for row in h_all_result.all():
            tid = row[0]
            uid = row[1]
            txt = row[2]
            if tid not in task_solver_hypotheses:
                task_solver_hypotheses[tid] = {}
            task_solver_hypotheses[tid][uid] = txt

        task_ids_with_tags: set[str] | None = None
        if has_tags is not None:
            tag_sql = text("SELECT DISTINCT task_id FROM task_tag")
            tag_result = await self.db_session.execute(tag_sql)
            task_ids_with_tags = {row[0] for row in tag_result.all()}

        items: list[TaskSearchRead] = []
        for task_id, dims in all_task_dims.items():
            solver_count, solver_emails, solver_ids = db_data.get(task_id, (0, [], []))

            if solver_email is not None and solver_email not in solver_emails:
                continue
            tf = task_id_filter
            if tf is not None and tf.lower() not in task_id.lower():
                continue
            if hypothesis_task_ids is not None and task_id not in hypothesis_task_ids:
                continue
            task_datasets = dims.get("datasets", set())
            has_1 = any(d.startswith("1_") for d in task_datasets)
            has_2 = any(d.startswith("2_") for d in task_datasets)
            if dataset and dataset != "all":
                if dataset in ("1", "2"):
                    if dataset == "1" and not has_1:
                        continue
                    if dataset == "2" and not has_2:
                        continue
                elif dataset == "both":
                    if not (has_1 and has_2):
                        continue
                elif dataset == "1_only":
                    if not (has_1 and not has_2):
                        continue
                elif dataset == "2_only":
                    if not (has_2 and not has_1):
                        continue
                elif dataset not in task_datasets:
                    continue
            if task_ids_with_tags is not None:
                has_tag = task_id in task_ids_with_tags
                if has_tags == "true" and not has_tag:
                    continue
                if has_tags == "false" and has_tag:
                    continue
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

            solver_hypotheses = task_solver_hypotheses.get(task_id, {})

            solvers = [
                SolverUserRead(
                    user_id=uid,
                    email=em,
                    hypothesis=solver_hypotheses.get(uid, None),
                )
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
                    datasets=sorted(task_datasets),
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

    async def search_review_groups(
        self,
        page: int = 1,
        per_page: int = 100,
        admin_user_id: int | None = None,
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
        solver_email: str | None = None,
        hypothesis_text: str | None = None,
        task_id_filter: str | None = None,
        dataset: str | None = None,
        has_tags: str | None = None,
        model_name: str | None = None,
        concept: str | None = None,
        witness_passed: bool | None = None,
        original_task_id: str | None = None,
        only_multiple_variants: bool = False,
        user_review_status: str | None = None,
        reviewer_user_id: int | None = None,
        reviewer_email: str | None = None,
        min_incorrect_marks: int | None = None,
        admin_review_status: str | None = None,
        admin_correct: bool | None = None,
        admin_verified: bool | None = None,
    ) -> TaskReviewGroupListRead:
        """Search synthetic-review groups (one row per original ARC task).

        Aggregates the synthetic variants of each original task together with
        per-user review markings (excluding the calling admin) and the admin's
        own review, joining the task-search dimensions/tags/solvers filters.
        """
        idx = _get_cached_index()
        variant_groups: dict[str, list[dict[str, Any]]] = {
            oid: tasks
            for oid, tasks in idx._by_original.items()
            if tasks
        }

        original_task_ids_filter: list[str] | None = None
        if original_task_id:
            original_task_ids_filter = [
                oid.strip() for oid in original_task_id.split(",") if oid.strip()
            ]

        if model_name is not None or concept or witness_passed is not None \
                or only_multiple_variants or original_task_ids_filter:
            filtered_groups: dict[str, list[dict[str, Any]]] = {}
            for oid, tasks in variant_groups.items():
                if original_task_ids_filter and not any(
                    f in oid for f in original_task_ids_filter
                ):
                    continue
                if only_multiple_variants and len(tasks) <= 1:
                    continue
                if model_name is not None and not any(
                    t.get("model_name") == model_name for t in tasks
                ):
                    continue
                if concept and not any(
                    concept.lower() in (t.get("concept") or "").lower()
                    for t in tasks
                ):
                    continue
                if witness_passed is True and not all(
                    t.get("witness_passed") is True for t in tasks
                ):
                    continue
                if witness_passed is False and not any(
                    t.get("witness_passed") is not True for t in tasks
                ):
                    continue
                filtered_groups[oid] = tasks
            variant_groups = filtered_groups

        if not variant_groups:
            return TaskReviewGroupListRead(
                items=[], total=0, page=page, per_page=per_page, total_pages=1
            )

        originals = list(variant_groups.keys())
        all_variant_ids = [
            t.get("id", "")
            for tasks in variant_groups.values()
            for t in tasks
            if t.get("id")
        ]

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
                AND e.task_id = ANY(:ids)
            GROUP BY e.task_id
        """)
        result = await self.db_session.execute(sql, {"ids": originals})
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

        h_all_sql = text("""
            SELECT DISTINCT ON (task_id, user_id)
                task_id,
                user_id,
                trigger->>'text' AS text
            FROM event
            WHERE trigger->>'kind' = 'cognitive'
              AND trigger->>'text' IS NOT NULL
              AND task_id = ANY(:ids)
            ORDER BY task_id, user_id, id DESC
        """)
        h_all_result = await self.db_session.execute(
            h_all_sql, {"ids": originals}
        )
        task_solver_hypotheses: dict[str, dict[int, str]] = {}
        for row in h_all_result.all():
            tid = row[0]
            uid = row[1]
            txt = row[2]
            if tid not in task_solver_hypotheses:
                task_solver_hypotheses[tid] = {}
            task_solver_hypotheses[tid][uid] = txt

        hypothesis_task_ids: set[str] | None = None
        if hypothesis_text:
            h_sql = text("""
                SELECT DISTINCT task_id
                FROM event
                WHERE trigger->>'kind' = 'cognitive'
                  AND trigger->>'text' ILIKE :pattern
                  AND task_id = ANY(:ids)
            """)
            h_result = await self.db_session.execute(
                h_sql, {"pattern": f"%{hypothesis_text}%", "ids": originals}
            )
            hypothesis_task_ids = {row[0] for row in h_result.all()}

        task_ids_with_tags: set[str] | None = None
        if has_tags is not None:
            tag_sql = text(
                "SELECT DISTINCT task_id FROM task_tag WHERE task_id = ANY(:ids)"
            )
            tag_result = await self.db_session.execute(
                tag_sql, {"ids": originals}
            )
            task_ids_with_tags = {row[0] for row in tag_result.all()}

        review_repo = UserReviewRepository(db_session=self.db_session)
        review_rows = await review_repo.get_reviews_by_tasks(all_variant_ids)
        rows_by_variant: dict[str, list[UserReview]] = {}
        reviewer_ids: set[int] = set()
        for r in review_rows:
            rows_by_variant.setdefault(r.synth_task_id, []).append(r)
            if r.user_id != admin_user_id:
                reviewer_ids.add(r.user_id)

        reviewer_emails: dict[int, str] = {}
        if reviewer_ids:
            email_sql = text(
                'SELECT id, email FROM "user" WHERE id = ANY(:ids)'
            )
            email_result = await self.db_session.execute(
                email_sql, {"ids": list(reviewer_ids)}
            )
            reviewer_emails = {row[0]: row[1] for row in email_result.all()}

        items: list[TaskReviewGroupRead] = []
        for oid, tasks in variant_groups.items():
            tasks_sorted = sorted(
                tasks, key=lambda t: (t.get("timestamp", ""), t.get("id", ""))
            )
            dims = all_task_dims.get(oid, {})
            width = dims.get("width", 0)
            height = dims.get("height", 0)
            task_datasets = set(dims.get("datasets", set()))
            has_1 = any(d.startswith("1_") for d in task_datasets)
            has_2 = any(d.startswith("2_") for d in task_datasets)
            if dataset and dataset != "all":
                if dataset in ("1", "2"):
                    if dataset == "1" and not has_1:
                        continue
                    if dataset == "2" and not has_2:
                        continue
                elif dataset == "both":
                    if not (has_1 and has_2):
                        continue
                elif dataset == "1_only":
                    if not (has_1 and not has_2):
                        continue
                elif dataset == "2_only":
                    if not (has_2 and not has_1):
                        continue
                elif dataset not in task_datasets:
                    continue
            if task_ids_with_tags is not None:
                has_tag = oid in task_ids_with_tags
                if has_tags == "true" and not has_tag:
                    continue
                if has_tags == "false" and has_tag:
                    continue
            if hypothesis_task_ids is not None and oid not in hypothesis_task_ids:
                continue

            solver_count, solver_emails, solver_ids = db_data.get(
                oid, (0, [], [])
            )
            if solver_email is not None and solver_email not in solver_emails:
                continue
            if min_solutions is not None and solver_count < min_solutions:
                continue
            if max_solutions is not None and solver_count > max_solutions:
                continue
            if task_id_filter and task_id_filter.lower() not in oid.lower():
                continue

            ti = all_transform.get(oid, {
                "same_size": True,
                "width_delta": 0,
                "height_delta": 0,
                "label": "same_size",
                "all_inputs_same": True,
                "all_outputs_same": True,
            })
            if same_size is not None and ti["same_size"] != same_size:
                continue
            if all_inputs_same is not None and (
                ti.get("all_inputs_same") != all_inputs_same
            ):
                continue
            if all_outputs_same is not None and (
                ti.get("all_outputs_same") != all_outputs_same
            ):
                continue
            wd = ti["width_delta"]
            hd = ti["height_delta"]
            if min_width is not None and width < min_width:
                continue
            if max_width is not None and width > max_width:
                continue
            if min_height is not None and height < min_height:
                continue
            if max_height is not None and height > max_height:
                continue
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

            user_agg = self._aggregate_user_reviews(
                tasks, rows_by_variant, admin_user_id
            )
            group_reviewer_emails = sorted(
                reviewer_emails[rid] for rid in user_agg["reviewer_ids"]
            )
            if user_review_status == "unreviewed" and user_agg["reviewed_variants"] > 0:
                continue
            if user_review_status == "reviewed" and user_agg["reviewed_variants"] == 0:
                continue
            if user_review_status == "any_incorrect" and (
                user_agg["variants_with_incorrect_mark"] == 0
            ):
                continue
            if user_review_status == "any_correct" and (
                user_agg["variants_with_correct_mark"] == 0
            ):
                continue
            if reviewer_user_id is not None and reviewer_user_id not in (
                user_agg["reviewer_ids"]
            ):
                continue
            if reviewer_email and reviewer_email.lower() not in {
                e.lower() for e in group_reviewer_emails
            }:
                continue
            if min_incorrect_marks is not None and (
                user_agg["incorrect_marks"] < min_incorrect_marks
            ):
                continue

            admin_agg = self._aggregate_admin_reviews(
                tasks, rows_by_variant, admin_user_id
            )
            if admin_review_status and admin_agg["status"] != admin_review_status:
                continue
            if admin_correct is True and admin_agg["correct_variants"] == 0:
                continue
            if admin_correct is False and admin_agg["incorrect_variants"] == 0:
                continue
            if admin_verified is True and admin_agg["verified_variants"] == 0:
                continue
            if admin_verified is False and admin_agg["verified_variants"] > 0:
                continue

            solver_hypotheses = task_solver_hypotheses.get(oid, {})
            solvers = [
                SolverUserRead(
                    user_id=uid,
                    email=em,
                    hypothesis=solver_hypotheses.get(uid, None),
                )
                for uid, em in zip(solver_ids, solver_emails, strict=False)
            ]

            items.append(
                TaskReviewGroupRead(
                    original_task_id=oid,
                    datasets=sorted(task_datasets),
                    solvers=solvers,
                    solution_count=solver_count,
                    has_solution=solver_count > 0,
                    width=width,
                    height=height,
                    same_size=ti["same_size"],
                    width_delta=wd,
                    height_delta=hd,
                    transform_label=ti["label"],
                    total_variants=len(tasks_sorted),
                    witness_passed_count=sum(
                        1 for t in tasks_sorted if t.get("witness_passed") is True
                    ),
                    witness_failed_count=sum(
                        1 for t in tasks_sorted if t.get("witness_passed") is not True
                    ),
                    models=sorted(
                        {
                            t.get("model_name", "")
                            for t in tasks_sorted
                            if t.get("model_name")
                        }
                    ),
                    concepts=sorted(
                        {t.get("concept", "") for t in tasks_sorted if t.get("concept")}
                    ),
                    first_variant_id=tasks_sorted[0].get("id", ""),
                    user_review=TaskReviewGroupUser(
                        distinct_reviewers=len(user_agg["reviewer_ids"]),
                        reviewed_variants=user_agg["reviewed_variants"],
                        unreviewed_variants=user_agg["unreviewed_variants"],
                        variants_with_incorrect_mark=user_agg["variants_with_incorrect_mark"],
                        variants_with_correct_mark=user_agg["variants_with_correct_mark"],
                        incorrect_marks=user_agg["incorrect_marks"],
                        correct_marks=user_agg["correct_marks"],
                        reviewer_emails=group_reviewer_emails,
                    ),
                    admin_review=TaskReviewGroupAdmin(
                        status=admin_agg["status"],
                        reviewed_variants=admin_agg["reviewed_variants"],
                        done_variants=admin_agg["done_variants"],
                        needs_revision_variants=admin_agg["needs_revision_variants"],
                        pending_variants=admin_agg["pending_variants"],
                        verified_variants=admin_agg["verified_variants"],
                        correct_variants=admin_agg["correct_variants"],
                        incorrect_variants=admin_agg["incorrect_variants"],
                    ),
                )
            )

        items.sort(key=lambda x: x.original_task_id)

        total = len(items)
        total_pages = max(1, math.ceil(total / per_page))
        page = max(1, min(page, total_pages))

        start = (page - 1) * per_page
        end = start + per_page
        paged_items = items[start:end]

        return TaskReviewGroupListRead(
            items=paged_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    @staticmethod
    def _aggregate_user_reviews(
        tasks: list[dict[str, Any]],
        rows_by_variant: dict[str, list[UserReview]],
        admin_user_id: int | None,
    ) -> dict[str, Any]:
        reviewer_ids: set[int] = set()
        reviewed_variants = 0
        variants_with_incorrect_mark = 0
        variants_with_correct_mark = 0
        incorrect_marks = 0
        correct_marks = 0
        for t in tasks:
            rows = rows_by_variant.get(t.get("id", ""), [])
            non_admin = [r for r in rows if r.user_id != admin_user_id]
            if not non_admin:
                continue
            reviewed_variants += 1
            for r in non_admin:
                reviewer_ids.add(r.user_id)
                if r.status == "needs_revision" or r.correct is False:
                    incorrect_marks += 1
                    variants_with_incorrect_mark += 1
                if r.status == "done" or r.correct is True:
                    correct_marks += 1
                    variants_with_correct_mark += 1
        return {
            "reviewer_ids": reviewer_ids,
            "reviewed_variants": reviewed_variants,
            "unreviewed_variants": len(tasks) - reviewed_variants,
            "variants_with_incorrect_mark": variants_with_incorrect_mark,
            "variants_with_correct_mark": variants_with_correct_mark,
            "incorrect_marks": incorrect_marks,
            "correct_marks": correct_marks,
        }

    @staticmethod
    def _aggregate_admin_reviews(
        tasks: list[dict[str, Any]],
        rows_by_variant: dict[str, list[UserReview]],
        admin_user_id: int | None,
    ) -> dict[str, Any]:
        reviewed_variants = 0
        done_variants = 0
        needs_revision_variants = 0
        pending_variants = 0
        verified_variants = 0
        correct_variants = 0
        incorrect_variants = 0
        for t in tasks:
            rows = rows_by_variant.get(t.get("id", ""), [])
            admin_rows = [r for r in rows if r.user_id == admin_user_id]
            if not admin_rows:
                continue
            reviewed_variants += 1
            status = admin_rows[0].status or "pending_review"
            if status == "done":
                done_variants += 1
            elif status == "needs_revision":
                needs_revision_variants += 1
            else:
                pending_variants += 1
            if admin_rows[0].verified:
                verified_variants += 1
            if admin_rows[0].correct is True:
                correct_variants += 1
            elif admin_rows[0].correct is False:
                incorrect_variants += 1
        if reviewed_variants == 0:
            status = "unreviewed"
        elif needs_revision_variants > 0:
            status = "needs_revision"
        elif done_variants == reviewed_variants:
            status = "done"
        else:
            status = "pending_review"
        return {
            "status": status,
            "reviewed_variants": reviewed_variants,
            "done_variants": done_variants,
            "needs_revision_variants": needs_revision_variants,
            "pending_variants": pending_variants,
            "verified_variants": verified_variants,
            "correct_variants": correct_variants,
            "incorrect_variants": incorrect_variants,
        }

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
        rows = result.all()
        user_ids = [row[0] for row in rows]
        email_map = {row[0]: row[1] for row in rows}

        h_sql = text("""
            SELECT DISTINCT ON (user_id)
                user_id,
                trigger->>'text' AS text
            FROM event
            WHERE task_id = :task_id
              AND trigger->>'kind' = 'cognitive'
              AND trigger->>'text' IS NOT NULL
            ORDER BY user_id, id DESC
        """)
        h_result = await self.db_session.execute(h_sql, {"task_id": task_id})
        hypothesis_map: dict[int, str] = {row[0]: row[1] for row in h_result.all()}

        return [
            TaskSolverRead(
                user_id=uid,
                email=email_map[uid],
                hypothesis=hypothesis_map.get(uid),
            )
            for uid in user_ids
        ]

    async def get_task_solvers_anon(
        self, task_id: str, exclude_user_id: int | None = None
    ) -> list[TaskSolverAnonRead]:
        sql = text("""
            SELECT DISTINCT u.id
            FROM event e
            JOIN "user" u ON u.id = e.user_id
            WHERE
                e.task_id = :task_id
                AND e.trigger->>'action' = 'submit'
                AND CAST(e.trigger->'details'->>'correct' AS BOOLEAN) = true
                AND (
                    CAST(:exclude_user_id AS INTEGER) IS NULL
                    OR u.id <> :exclude_user_id
                )
            ORDER BY u.id
        """)
        result = await self.db_session.execute(
            sql, {"task_id": task_id, "exclude_user_id": exclude_user_id}
        )
        rows = result.all()
        user_ids = [row[0] for row in rows]

        h_sql = text("""
            SELECT DISTINCT ON (user_id)
                user_id,
                trigger->>'text' AS text
            FROM event
            WHERE task_id = :task_id
              AND trigger->>'kind' = 'cognitive'
              AND trigger->>'text' IS NOT NULL
            ORDER BY user_id, id DESC
        """)
        h_result = await self.db_session.execute(h_sql, {"task_id": task_id})
        hypothesis_map: dict[int, str] = {
            row[0]: row[1] for row in h_result.all()
        }

        return [
            TaskSolverAnonRead(hypothesis=hypothesis_map.get(uid))
            for uid in user_ids
        ]

    async def get_my_hypothesis(self, task_id: str, user_id: int) -> str | None:
        sql = text("""
            SELECT trigger->>'text' AS text
            FROM event
            WHERE task_id = :task_id
              AND user_id = :user_id
              AND trigger->>'kind' = 'cognitive'
              AND trigger->>'text' IS NOT NULL
            ORDER BY id DESC
            LIMIT 1
        """)
        result = await self.db_session.execute(
            sql, {"task_id": task_id, "user_id": user_id}
        )
        row = result.first()
        return row[0] if row else None

    async def save_my_hypothesis(
        self, task_id: str, user_id: int, hypothesis: str
    ) -> str:
        """Save the current user's hypothesis for a task as a new cognitive
        revision event, mirroring the solve page's hypothesis_revision flow."""
        node_id = f"my_hypothesis_{int(time.time() * 1000)}"
        repo = EventRepository(db_session=self.db_session)
        await repo.create(
            {
                "user_id": user_id,
                "task_id": task_id,
                "attempt_id": None,
                "node_id": node_id,
                "parent_node_id": None,
                "test_pair_index": None,
                "trigger": {
                    "kind": "cognitive",
                    "intent": "hypothesis_revision",
                    "text": hypothesis,
                },
                "state_snapshot": [[]],
                "timestamp": int(time.time() * 1000),
                "sequence_index": None,
            }
        )
        return hypothesis

    @staticmethod
    def _dataset_split_label(dataset: str, challenges_file: str) -> str:
        split_map = {"training": "train", "evaluation": "eval", "test": "test"}
        for key, label in split_map.items():
            if key in challenges_file:
                return f"{dataset}_{label}"
        return dataset

    def _ensure_datasets(
        self, result: dict[str, dict[str, Any]], task_id: str,
        dataset: str, challenges_file: str,
    ) -> None:
        if task_id not in result:
            result[task_id] = {"datasets": set()}
        result[task_id]["datasets"].add(
            self._dataset_split_label(dataset, challenges_file)
        )

    def _load_all_transform_info(self) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for static_dir, challenges_file, _solutions_file, dataset in SOURCES:
            challenges = self._arc_service._load_json(challenges_file, static_dir)
            for task_id, task_data in challenges.items():
                self._ensure_datasets(result, task_id, dataset, challenges_file)
                if task_id in result and result[task_id].get("_done"):
                    continue
                train = task_data.get("train", [])
                if not train:
                    result[task_id].update({
                        "same_size": True,
                        "width_delta": None,
                        "height_delta": None,
                        "label": "no_train",
                        "all_inputs_same": True,
                        "all_outputs_same": True,
                        "_done": True,
                    })
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
                    result[task_id].update({
                        "same_size": True,
                        "width_delta": None,
                        "height_delta": None,
                        "label": "no_train",
                        "all_inputs_same": True,
                        "all_outputs_same": True,
                        "_done": True,
                    })
                    continue
                first_dw, first_dh = deltas[0]
                all_same = all(d == (first_dw, first_dh) for d in deltas)
                same_size = all(d == (0, 0) for d in deltas)
                all_inputs_same = all(s == input_sizes[0] for s in input_sizes)
                all_outputs_same = all(s == output_sizes[0] for s in output_sizes)
                if same_size:
                    result[task_id].update({
                        "same_size": True,
                        "width_delta": 0,
                        "height_delta": 0,
                        "label": "same_size",
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                        "_done": True,
                    })
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
                    result[task_id].update({
                        "same_size": False,
                        "width_delta": dw,
                        "height_delta": dh,
                        "label": label,
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                        "_done": True,
                    })
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
                    result[task_id].update({
                        "same_size": False,
                        "width_delta": None,
                        "height_delta": None,
                        "label": mixed_label,
                        "all_inputs_same": all_inputs_same,
                        "all_outputs_same": all_outputs_same,
                        "_done": True,
                    })
        return result

    def _load_all_task_dimensions(self) -> dict[str, dict[str, Any]]:
        dims: dict[str, dict[str, Any]] = {}

        for static_dir, challenges_file, _solutions_file, dataset in SOURCES:
            challenges = self._arc_service._load_json(challenges_file, static_dir)
            for task_id, task_data in challenges.items():
                if task_id not in dims:
                    width, height = self._first_grid_dims(task_data)
                    dims[task_id] = {"width": width, "height": height,
                                     "datasets": set()}
                dims[task_id]["datasets"].add(
                    self._dataset_split_label(dataset, challenges_file)
                )

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
