import json
import random
from pathlib import Path
from typing import Any

from app.schemas.arc_task import ArcTaskPair, ArcTaskRead, GridData

STATIC_DIR_1 = Path(__file__).resolve().parents[2] / "static" / "ARC-AGI-1"
STATIC_DIR_2 = Path(__file__).resolve().parents[2] / "static" / "ARC-AGI-2"

# challenges_file, solutions_file
SOURCE_FILE_ENTRY = tuple[str, str | None]

SOURCE_FILES: list[SOURCE_FILE_ENTRY] = [
    ("arc-agi_training_challenges.json", "arc-agi_training_solutions.json"),
    ("arc-agi_evaluation_challenges.json", "arc-agi_evaluation_solutions.json"),
    ("arc-agi_test_challenges.json", None),
]

# static_dir, challenges_file, solutions_file, dataset_label
SOURCE_ENTRY = tuple[Path, str, str | None, str]

SOURCES: list[SOURCE_ENTRY] = [
    (STATIC_DIR_1, "arc-agi_training_challenges.json",
     "arc-agi_training_solutions.json", "1"),
    (STATIC_DIR_1, "arc-agi_evaluation_challenges.json",
     "arc-agi_evaluation_solutions.json", "1"),
    (STATIC_DIR_1, "arc-agi_test_challenges.json", None, "1"),
    (STATIC_DIR_2, "arc-agi_training_challenges.json",
     "arc-agi_training_solutions.json", "2"),
    (STATIC_DIR_2, "arc-agi_evaluation_challenges.json",
     "arc-agi_evaluation_solutions.json", "2"),
    (STATIC_DIR_2, "arc-agi_test_challenges.json", None, "2"),
]


class ArcTaskService:
    def __init__(self, static_dir: Path = STATIC_DIR_2) -> None:
        self._static_dir = static_dir

    async def _find_task(self, task_id: str) -> ArcTaskRead | None:
        for challenges_file, solutions_file in SOURCE_FILES:
            challenges = self._load_json(challenges_file, self._static_dir)
            if task_id in challenges:
                solutions = {}
                if solutions_file:
                    solutions = self._load_json(solutions_file, self._static_dir)
                return self._build_task(
                    task_id, challenges[task_id], solutions.get(task_id, []),
                )
        return None

    async def get_by_id(
        self, task_id: str, include_test_outputs: bool = True
    ) -> ArcTaskRead | None:
        task = await self._find_task(task_id)
        if task is None or include_test_outputs:
            return task
        stripped_test = [
            ArcTaskPair(input=pair.input, output=[]) for pair in task.test
        ]
        return ArcTaskRead(id=task.id, train=task.train, test=stripped_test)

    async def get_solutions(self, task_id: str) -> list[GridData] | None:
        for challenges_file, solutions_file in SOURCE_FILES:
            challenges = self._load_json(challenges_file, self._static_dir)
            if task_id in challenges:
                if solutions_file is None:
                    return None
                solutions = self._load_json(solutions_file, self._static_dir)
                return solutions.get(task_id)
        return None

    async def check_submission(
        self, task_id: str, grids: dict[int, GridData]
    ) -> bool:
        solutions = await self.get_solutions(task_id)
        if not solutions:
            return False
        for index, grid in grids.items():
            if index < 0 or index >= len(solutions):
                return False
            if grid != solutions[index]:
                return False
        return True

    async def get_random_tasks(self, count: int = 10) -> list[ArcTaskRead]:
        challenges = self._load_json(
            "arc-agi_training_challenges.json", self._static_dir)
        solutions = self._load_json(
            "arc-agi_training_solutions.json", self._static_dir)
        ids = list(challenges.keys())
        if not ids:
            return []
        sample_size = min(count, len(ids))
        chosen_ids = random.sample(ids, sample_size)
        return [
            self._build_task(task_id, challenges[task_id], solutions.get(task_id, []))
            for task_id in chosen_ids
        ]

    async def get_random_tasks_from_ids(
        self, count: int = 10, allowed_ids: list[str] | None = None
    ) -> list[ArcTaskRead]:
        if not allowed_ids:
            return await self.get_random_tasks(count=count)
        tasks: list[ArcTaskRead] = []
        for task_id in allowed_ids:
            task = await self._find_task(task_id)
            if task:
                tasks.append(task)
        if not tasks:
            return []
        sample_size = min(count, len(tasks))
        chosen = random.sample(tasks, sample_size)
        return chosen

    def _load_json(self, name: str, static_dir: Path | None = None) -> dict[str, Any]:
        path = (static_dir or self._static_dir) / name
        with path.open("r", encoding="utf-8") as fh:
            data: dict[str, Any] = json.load(fh)
        return data

    def _build_task(
        self,
        task_id: str,
        challenge: dict[str, Any],
        task_solutions: list[list[list[int]]],
    ) -> ArcTaskRead:
        test_pairs = [
            ArcTaskPair(
                input=pair["input"],
                output=task_solutions[i] if i < len(task_solutions) else [],
            )
            for i, pair in enumerate(challenge["test"])
        ]
        train_pairs = [
            ArcTaskPair(input=pair["input"], output=pair["output"])
            for pair in challenge["train"]
        ]
        return ArcTaskRead(id=task_id, train=train_pairs, test=test_pairs)
