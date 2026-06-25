import json
from pathlib import Path
from typing import Any

import pytest

from app.schemas.arc_task import ArcTaskRead
from app.services.arc_task import ArcTaskService


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    challenges = {
        "task-1": {
            "train": [{"input": [[1, 1]], "output": [[2, 2]]}],
            "test": [{"input": [[3, 3]]}, {"input": [[4, 4]]}],
        },
        "task-2": {
            "train": [{"input": [[5]], "output": [[6]]}],
            "test": [{"input": [[7]]}],
        },
        "task-3": {
            "train": [{"input": [[8]], "output": [[9]]}],
            "test": [{"input": [[0]]}],
        },
    }
    solutions = {
        "task-1": [[[10, 10]], [[11, 11]]],
        "task-2": [[[12]]],
        # task-3 intentionally missing from solutions
    }
    _write_json(tmp_path / "arc-agi_training_challenges.json", challenges)
    _write_json(tmp_path / "arc-agi_training_solutions.json", solutions)
    return tmp_path


@pytest.fixture
def service(static_dir: Path) -> ArcTaskService:
    return ArcTaskService(static_dir=static_dir)


class TestArcTaskServiceGetRandomTasks:
    async def test_returns_requested_count(self, service: ArcTaskService) -> None:
        result = await service.get_random_tasks(count=2)
        assert len(result) == 2
        assert all(isinstance(task, ArcTaskRead) for task in result)

    async def test_returns_unique_tasks(self, service: ArcTaskService) -> None:
        result = await service.get_random_tasks(count=3)
        ids = {task.id for task in result}
        assert ids == {"task-1", "task-2", "task-3"}

    async def test_merges_test_outputs(self, service: ArcTaskService) -> None:
        result = await service.get_random_tasks(count=3)
        task_one = next(task for task in result if task.id == "task-1")
        assert task_one.test[0].output == [[10, 10]]
        assert task_one.test[1].output == [[11, 11]]
        assert task_one.test[0].input == [[3, 3]]

    async def test_falls_back_to_empty_output_when_solution_missing(
        self, service: ArcTaskService
    ) -> None:
        result = await service.get_random_tasks(count=3)
        task_three = next(task for task in result if task.id == "task-3")
        assert task_three.test[0].output == []

    async def test_count_clamped_to_available_tasks(
        self, service: ArcTaskService
    ) -> None:
        result = await service.get_random_tasks(count=99)
        assert len(result) == 3

    async def test_returns_empty_list_when_no_tasks(
        self, tmp_path: Path
    ) -> None:
        _write_json(tmp_path / "arc-agi_training_challenges.json", {})
        _write_json(tmp_path / "arc-agi_training_solutions.json", {})
        service = ArcTaskService(static_dir=tmp_path)
        result = await service.get_random_tasks(count=10)
        assert result == []

    async def test_preserves_train_pairs(self, service: ArcTaskService) -> None:
        result = await service.get_random_tasks(count=3)
        task_two = next(task for task in result if task.id == "task-2")
        assert len(task_two.train) == 1
        assert task_two.train[0].input == [[5]]
        assert task_two.train[0].output == [[6]]


class TestArcTaskServiceGetById:
    async def test_includes_test_outputs_by_default(
        self, service: ArcTaskService
    ) -> None:
        task = await service.get_by_id("task-1")
        assert task is not None
        assert task.test[0].output == [[10, 10]]

    async def test_strips_test_outputs_when_excluded(
        self, service: ArcTaskService
    ) -> None:
        task = await service.get_by_id("task-1", include_test_outputs=False)
        assert task is not None
        # Test solutions are hidden, but inputs and train demos remain.
        assert all(pair.output == [] for pair in task.test)
        assert task.test[0].input == [[3, 3]]
        assert task.train[0].output == [[2, 2]]


class TestArcTaskServiceCheckSubmission:
    async def test_returns_true_when_all_tests_match(
        self, service: ArcTaskService
    ) -> None:
        ok = await service.check_submission(
            "task-1", {0: [[10, 10]], 1: [[11, 11]]}
        )
        assert ok is True

    async def test_returns_false_when_a_grid_is_wrong(
        self, service: ArcTaskService
    ) -> None:
        ok = await service.check_submission(
            "task-1", {0: [[10, 10]], 1: [[99, 99]]}
        )
        assert ok is False

    async def test_returns_false_when_a_test_is_missing(
        self, service: ArcTaskService
    ) -> None:
        ok = await service.check_submission("task-1", {0: [[10, 10]]})
        assert ok is False

    async def test_returns_false_when_no_solutions(
        self, service: ArcTaskService
    ) -> None:
        ok = await service.check_submission("task-3", {0: [[0]]})
        assert ok is False
