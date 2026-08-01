from app.schemas.batch import BatchCreate, BatchRead, BatchUpdate


class TestBatchCreate:
    def test_defaults_to_solver_type(self) -> None:
        data = BatchCreate(name="Lote A", task_ids=["t1", "t2"])
        assert data.batch_type == "solver"

    def test_accepts_review_type(self) -> None:
        data = BatchCreate(
            name="Lote R", task_ids=["gen_1"], batch_type="review"
        )
        assert data.batch_type == "review"


class TestBatchUpdate:
    def test_batch_type_optional(self) -> None:
        data = BatchUpdate(name="nuevo")
        assert data.batch_type is None

    def test_updates_batch_type(self) -> None:
        data = BatchUpdate(batch_type="review")
        assert data.batch_type == "review"


class TestBatchRead:
    def test_defaults_to_solver_type(self) -> None:
        read = BatchRead(id=1, name="A", task_ids=["t1"])
        assert read.batch_type == "solver"
