from datetime import UTC, datetime, timedelta

from app.schemas.user_review import SolverReviewVariant, UserReviewRead


class TestUserReviewRead:
    def test_defaults(self) -> None:
        data = UserReviewRead(user_id=1, synth_task_id="gen_1")
        assert data.status == "pending_review"
        assert data.started_at is None
        assert data.finished_at is None
        assert data.duration_seconds is None

    def test_full_read(self) -> None:
        now = datetime.now(UTC)
        data = UserReviewRead(
            user_id=1,
            synth_task_id="gen_1",
            status="done",
            correct=True,
            verified=True,
            notes=["ok"],
            started_at=now,
            finished_at=now + timedelta(seconds=90),
            duration_seconds=90,
        )
        assert data.duration_seconds == 90
        dumped = data.model_dump(by_alias=True)
        assert dumped["startedAt"] == now
        assert dumped["finishedAt"] == now + timedelta(seconds=90)
        assert dumped["durationSeconds"] == 90


class TestSolverReviewVariant:
    def test_defaults(self) -> None:
        variant = SolverReviewVariant(synth_task_id="gen_1")
        assert variant.duration_seconds is None

    def test_with_duration(self) -> None:
        variant = SolverReviewVariant(
            synth_task_id="gen_1",
            status="done",
            duration_seconds=75,
        )
        assert variant.duration_seconds == 75
        assert variant.model_dump(by_alias=True)["durationSeconds"] == 75
