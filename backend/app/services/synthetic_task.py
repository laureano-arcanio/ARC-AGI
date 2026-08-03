import json
import math
import os
import threading
from pathlib import Path
from typing import Any

from app.schemas.synthetic_review import (
    SyntheticReviewRead,
    SyntheticReviewUpdate,
    SyntheticTaskListRead,
    SyntheticTaskRead,
)

STATIC_DIR = Path(__file__).resolve().parents[2] / "static"
TASKS_PATH = STATIC_DIR / "synthetic_tasks.jsonl"
REVIEWS_PATH = STATIC_DIR / "synthetic_reviews.json"

_lock = threading.Lock()
_tasks_cache: tuple[float, list[dict[str, Any]]] | None = None
_reviews_cache: tuple[float, dict[str, dict[str, Any]]] | None = None
_index_cache: tuple[float, float, "_TaskIndex"] | None = None


def _file_mtime(path: Path) -> float:
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0.0


def _load_tasks() -> list[dict[str, Any]]:
    global _tasks_cache
    if not TASKS_PATH.exists():
        _tasks_cache = None
        return []
    mtime = _file_mtime(TASKS_PATH)
    if _tasks_cache is not None and _tasks_cache[0] == mtime:
        return _tasks_cache[1]
    lines: list[dict[str, Any]] = []
    with open(TASKS_PATH) as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(json.loads(line))
    _tasks_cache = (mtime, lines)
    return lines


def _load_reviews() -> dict[str, dict[str, Any]]:
    global _reviews_cache
    if not REVIEWS_PATH.exists():
        _reviews_cache = None
        return {}
    mtime = _file_mtime(REVIEWS_PATH)
    if _reviews_cache is not None and _reviews_cache[0] == mtime:
        return _reviews_cache[1]
    with open(REVIEWS_PATH) as f:
        data: dict[str, dict[str, Any]] = json.load(f)
    _reviews_cache = (mtime, data)
    return data


def _save_reviews(reviews: dict[str, dict[str, Any]]) -> None:
    global _reviews_cache, _index_cache
    REVIEWS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REVIEWS_PATH, "w") as f:
        json.dump(reviews, f, indent=2, ensure_ascii=False)
    mtime = _file_mtime(REVIEWS_PATH)
    _reviews_cache = (mtime, reviews)
    _index_cache = None


class _TaskIndex:
    def __init__(self, tasks: list[dict[str, Any]], reviews: dict[str, dict[str, Any]]):
        self._by_id: dict[str, dict[str, Any]] = {}
        self._by_original: dict[str, list[dict[str, Any]]] = {}
        self.reviews = reviews
        for t in tasks:
            tid = t.get("id", "")
            if tid:
                self._by_id[tid] = t
            oid = t.get("original_task_id", "")
            if oid:
                self._by_original.setdefault(oid, []).append(t)

    def resolve(self, entry_id: str) -> list[dict[str, Any]]:
        if entry_id in self._by_id:
            return [self._by_id[entry_id]]
        return self._by_original.get(entry_id, [])


def _get_cached_index() -> _TaskIndex:
    global _index_cache
    tasks_mtime = _file_mtime(TASKS_PATH)
    reviews_mtime = _file_mtime(REVIEWS_PATH)
    if (
        _index_cache is not None
        and _index_cache[0] == tasks_mtime
        and _index_cache[1] == reviews_mtime
    ):
        return _index_cache[2]
    tasks = _load_tasks()
    reviews = _load_reviews()
    idx = _TaskIndex(tasks, reviews)
    _index_cache = (tasks_mtime, reviews_mtime, idx)
    return idx


def _task_to_read(
    task: dict[str, Any], review: dict[str, Any] | None
) -> SyntheticTaskRead:
    return SyntheticTaskRead(
        id=task.get("id", ""),
        original_task_id=task.get("original_task_id", ""),
        model_name=task.get("model_name", ""),
        seed=task.get("seed"),
        timestamp=task.get("timestamp"),
        concept=task.get("concept"),
        num_train=task.get("num_train", 8),
        num_test=task.get("num_test", 2),
        witness_passed=task.get("witness_passed", False),
        witness_n_passed=task.get("witness_n_passed"),
        witness_n_total=task.get("witness_n_total"),
        review_status=(review or {}).get("status", "pending_review"),
        correct=(review or {}).get("correct"),
        verified=(review or {}).get("verified", False),
        hypothesis=task.get("hypothesis"),
        train=task.get("train", []),
        test=task.get("test", []),
    )


class SyntheticTaskService:
    def list_tasks(
        self,
        page: int = 1,
        per_page: int = 50,
        model_name: str | None = None,
        witness_passed: bool | None = None,
        review_status: str | None = None,
        original_task_id: str | None = None,
        concept: str | None = None,
        correct: bool | None = None,
        verified: bool | None = None,
        only_multiple_variants: bool = False,
    ) -> SyntheticTaskListRead:
        tasks = _load_tasks()
        reviews = _load_reviews()

        if only_multiple_variants:
            task_id_counts: dict[str, int] = {}
            for t in tasks:
                oid = t.get("original_task_id", "")
                if oid:
                    task_id_counts[oid] = task_id_counts.get(oid, 0) + 1
            include_ids = {oid for oid, count in task_id_counts.items() if count > 1}
            tasks = [t for t in tasks if t.get("original_task_id", "") in include_ids]

        original_task_ids: list[str] | None = None
        if original_task_id:
            original_task_ids = [
                oid.strip() for oid in original_task_id.split(",") if oid.strip()
            ]

        filtered = []
        for t in tasks:
            if model_name and t.get("model_name") != model_name:
                continue
            if witness_passed is not None and t.get("witness_passed") != witness_passed:
                continue
            if original_task_ids:
                task_oid = t.get("original_task_id", "")
                if not any(oid in task_oid for oid in original_task_ids):
                    continue
            if concept and concept.lower() not in (t.get("concept") or "").lower():
                continue
            if review_status:
                r = reviews.get(t["id"])
                if not r or r.get("status") != review_status:
                    continue
            if correct is not None:
                r = reviews.get(t["id"], {})
                if r.get("correct") != correct:
                    continue
            if verified is not None:
                r = reviews.get(t["id"], {})
                if r.get("verified", False) != verified:
                    continue
            filtered.append(t)

        # Sort by original_task_id so same tasks are grouped together
        filtered.sort(
            key=lambda t: (
                t.get("original_task_id", ""),
                t.get("timestamp", ""),
            )
        )

        total = len(filtered)
        total_pages = max(1, math.ceil(total / per_page))
        start = (page - 1) * per_page
        end = start + per_page
        page_items = filtered[start:end]

        items = [
            _task_to_read(t, reviews.get(t["id"])) for t in page_items
        ]

        return SyntheticTaskListRead(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )

    def get_task(self, synth_task_id: str) -> SyntheticTaskRead | None:
        tasks = _load_tasks()
        reviews = _load_reviews()
        for t in tasks:
            if t.get("id") == synth_task_id:
                return _task_to_read(t, reviews.get(synth_task_id))
        return None

    def resolve_entry(self, entry_id: str) -> list[SyntheticTaskRead]:
        """Resolve a review batch entry to its synthetic tasks.

        An entry may be either a synthetic task id (returns that single task)
        or an original ARC task id (returns all its synthetic variants).
        """
        index = self._build_index()
        return [
            _task_to_read(t, index.reviews.get(t.get("id", "")))
            for t in index.resolve(entry_id)
        ]

    def resolve_entry_ids(self, entry_ids: list[str]) -> dict[str, list[str]]:
        """Bulk-resolve entry IDs to their variant IDs (one file read)."""
        index = self._build_index()
        result: dict[str, list[str]] = {}
        for eid in entry_ids:
            result[eid] = [t.get("id", "") for t in index.resolve(eid)]
        return result

    def _build_index(self) -> "_TaskIndex":
        return _get_cached_index()

    def get_review(self, synth_task_id: str) -> SyntheticReviewRead:
        reviews = _load_reviews()
        r = reviews.get(synth_task_id)
        if r is None:
            return SyntheticReviewRead(synth_task_id=synth_task_id)
        return SyntheticReviewRead(
            synth_task_id=synth_task_id,
            status=r.get("status", "pending_review"),
            correct=r.get("correct"),
            verified=r.get("verified", False),
            notes=r.get("notes", []),
        )

    def list_models(self) -> list[str]:
        tasks = _load_tasks()
        models = sorted({t.get("model_name", "") for t in tasks if t.get("model_name")})
        return models

    @staticmethod
    def user_can_review_original(
        original_task_id: str, synth_task_ids: list[str]
    ) -> bool:
        if not synth_task_ids:
            return False
        ids = set(synth_task_ids)
        if original_task_id in ids:
            return True
        idx = _get_cached_index()
        for tid in ids:
            t = idx._by_id.get(tid)
            if t and t.get("original_task_id") == original_task_id:
                return True
        return False

    @staticmethod
    def user_has_variant_access(
        review_task_ids: list[str], variant_id: str
    ) -> bool:
        """True if a reviewer can access a synthetic variant.

        Allowed when the variant id itself is in the review batches, or when
        its original ARC task id is (batches may reference original tasks).
        """
        if not review_task_ids:
            return False
        ids = set(review_task_ids)
        if variant_id in ids:
            return True
        idx = _get_cached_index()
        t = idx._by_id.get(variant_id)
        return bool(t and t.get("original_task_id") in ids)

    def update_review(
        self, synth_task_id: str, data: SyntheticReviewUpdate
    ) -> SyntheticReviewRead:
        with _lock:
            reviews = _load_reviews()
            record = reviews.get(
                synth_task_id, {"status": "pending_review", "notes": []}
            )
            if data.status is not None:
                record["status"] = data.status
            if data.correct is not None:
                record["correct"] = data.correct
            if data.verified is not None:
                record["verified"] = data.verified
            if data.notes is not None:
                record["notes"] = data.notes
            reviews[synth_task_id] = record
            _save_reviews(reviews)
        return SyntheticReviewRead(
            synth_task_id=synth_task_id,
            status=record["status"],
            correct=record.get("correct"),
            verified=record.get("verified", False),
            notes=record["notes"],
        )
