import pytest
from pydantic import ValidationError

from app.schemas.arc_task import ArcTaskPair, ArcTaskRead


class TestArcTaskPair:
    def test_valid_pair(self) -> None:
        pair = ArcTaskPair(input=[[1, 2], [3, 4]], output=[[5, 6]])
        assert pair.input == [[1, 2], [3, 4]]
        assert pair.output == [[5, 6]]

    def test_empty_grids_allowed(self) -> None:
        pair = ArcTaskPair(input=[], output=[])
        assert pair.input == []
        assert pair.output == []

    def test_serializes_with_input_output_keys(self) -> None:
        pair = ArcTaskPair(input=[[0]], output=[[1]])
        dumped = pair.model_dump(by_alias=True)
        assert set(dumped.keys()) == {"input", "output"}

    def test_rejects_non_grid_input(self) -> None:
        with pytest.raises(ValidationError):
            ArcTaskPair(input="not-a-grid", output=[[1]])  # type: ignore[arg-type]


class TestArcTaskRead:
    def test_full_task(self) -> None:
        task = ArcTaskRead(
            id="abc123",
            train=[ArcTaskPair(input=[[1]], output=[[2]])],
            test=[ArcTaskPair(input=[[3]], output=[[4]])],
        )
        assert task.id == "abc123"
        assert len(task.train) == 1
        assert len(task.test) == 1
        assert task.test[0].output == [[4]]

    def test_serializes_with_expected_keys(self) -> None:
        task = ArcTaskRead(
            id="id-1",
            train=[],
            test=[ArcTaskPair(input=[[0]], output=[[1]])],
        )
        dumped = task.model_dump(by_alias=True)
        assert set(dumped.keys()) == {"id", "train", "test"}
        assert dumped["test"][0]["input"] == [[0]]
        assert dumped["test"][0]["output"] == [[1]]

    def test_requires_id(self) -> None:
        with pytest.raises(ValidationError):
            ArcTaskRead(train=[], test=[])  # type: ignore[call-arg]

    def test_from_dict_via_model_validate(self) -> None:
        raw = {
            "id": "from-dict",
            "train": [{"input": [[1]], "output": [[2]]}],
            "test": [{"input": [[3]], "output": [[4]]}],
        }
        task = ArcTaskRead.model_validate(raw)
        assert task.id == "from-dict"
        assert task.train[0].output == [[2]]
        assert task.test[0].input == [[3]]
