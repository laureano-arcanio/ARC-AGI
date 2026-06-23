import json
import random
from pathlib import Path
from typing import Any

from app.schemas.arc_task import ArcTaskPair, ArcTaskRead

STATIC_DIR = Path(__file__).resolve().parents[2] / "static" / "ARC-AGI-2"

SOURCES: list[tuple[str, str | None]] = [
    ("arc-agi_training_challenges.json", "arc-agi_training_solutions.json"),
    ("arc-agi_evaluation_challenges.json", "arc-agi_evaluation_solutions.json"),
    ("arc-agi_test_challenges.json", None),
]


class ArcTaskService:
    def __init__(self, static_dir: Path = STATIC_DIR) -> None:
        self._static_dir = static_dir

    async def _find_task(self, task_id: str) -> ArcTaskRead | None:
        for challenges_file, solutions_file in SOURCES:
            challenges = self._load_json(challenges_file)
            if task_id in challenges:
                solutions = self._load_json(solutions_file) if solutions_file else {}
                return self._build_task(
                    task_id, challenges[task_id], solutions.get(task_id, []),
                )
        return None

    async def get_by_id(self, task_id: str) -> ArcTaskRead | None:
        return await self._find_task(task_id)

    async def get_random_tasks(self, count: int = 10) -> list[ArcTaskRead]:
        challenges = self._load_json("arc-agi_training_challenges.json")
        solutions = self._load_json("arc-agi_training_solutions.json")
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

    def _load_json(self, name: str) -> dict[str, Any]:
        path = self._static_dir / name
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
