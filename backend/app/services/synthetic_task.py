import json
import os
from pathlib import Path
from typing import Any

from app.schemas.synthetic_review import SyntheticTaskRead

STATIC_DIR = Path(__file__).resolve().parents[2] / "static"
TASKS_PATH = STATIC_DIR / "synthetic_tasks.jsonl"

_tasks_cache: tuple[float, list[dict[str, Any]]] | None = None
_index_cache: tuple[float, "_TaskIndex"] | None = None


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


class _TaskIndex:
    def __init__(self, tasks: list[dict[str, Any]]):
        self._by_id: dict[str, dict[str, Any]] = {}
        self._by_original: dict[str, list[dict[str, Any]]] = {}
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


def _get_cached_index() -> "_TaskIndex":
    global _index_cache
    tasks_mtime = _file_mtime(TASKS_PATH)
    if _index_cache is not None and _index_cache[0] == tasks_mtime:
        return _index_cache[1]
    tasks = _load_tasks()
    idx = _TaskIndex(tasks)
    _index_cache = (tasks_mtime, idx)
    return idx


def _task_to_read(task: dict[str, Any]) -> SyntheticTaskRead:
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
        hypothesis=task.get("hypothesis"),
        train=task.get("train", []),
        test=task.get("test", []),
    )


class SyntheticTaskService:
    def get_task(self, synth_task_id: str) -> SyntheticTaskRead | None:
        tasks = _load_tasks()
        for t in tasks:
            if t.get("id") == synth_task_id:
                return _task_to_read(t)
        return None

    def resolve_entry(self, entry_id: str) -> list[SyntheticTaskRead]:
        """Resolve a review batch entry to its synthetic tasks.

        An entry may be either a synthetic task id (returns that single task)
        or an original ARC task id (returns all its synthetic variants).
        """
        index = self._build_index()
        return [_task_to_read(t) for t in index.resolve(entry_id)]

    def resolve_entry_ids(self, entry_ids: list[str]) -> dict[str, list[str]]:
        """Bulk-resolve entry IDs to their variant IDs (one file read)."""
        index = self._build_index()
        result: dict[str, list[str]] = {}
        for eid in entry_ids:
            result[eid] = [t.get("id", "") for t in index.resolve(eid)]
        return result

    def _build_index(self) -> "_TaskIndex":
        return _get_cached_index()

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
