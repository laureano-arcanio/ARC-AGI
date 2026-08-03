from app.services.task_stats import TaskStatsService
from tests.conftest import MockAsyncSession, MockResult


def _make_service(db_session: MockAsyncSession) -> TaskStatsService:
    return TaskStatsService(db_session=db_session)  # type: ignore[arg-type]


class TestGetMyHypothesis:
    async def test_returns_latest_cognitive_text(self) -> None:
        session = MockAsyncSession()
        session.set_execute_result(
            MockResult(scalar_one_or_none_result=("mi hipótesis",))
        )
        service = _make_service(session)
        result = await service.get_my_hypothesis("gen_1", 1)
        assert result == "mi hipótesis"

    async def test_returns_none_when_no_hypothesis(self) -> None:
        session = MockAsyncSession()
        session.set_execute_result(MockResult(scalar_one_or_none_result=None))
        service = _make_service(session)
        result = await service.get_my_hypothesis("gen_1", 1)
        assert result is None


class TestSaveMyHypothesis:
    async def test_creates_revision_event(self) -> None:
        session = MockAsyncSession()
        service = _make_service(session)
        result = await service.save_my_hypothesis("gen_1", 1, "regla revisada")
        assert result == "regla revisada"
        assert len(session.added) == 1
        event = session.added[0]
        assert event.user_id == 1
        assert event.task_id == "gen_1"
        assert event.attempt_id is None
        assert event.trigger["kind"] == "cognitive"
        assert event.trigger["intent"] == "hypothesis_revision"
        assert event.trigger["text"] == "regla revisada"
        assert session.flushed is True
