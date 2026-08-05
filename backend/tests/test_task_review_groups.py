from app.models.user_review import UserReview
from app.services import task_stats as task_stats_mod
from app.services.task_stats import TaskStatsService
from tests.conftest import MockAsyncSession, MockResult


def _review(
    user_id: int,
    synth_task_id: str,
    status: str = "pending_review",
    correct: bool | None = None,
    verified: bool = False,
) -> UserReview:
    return UserReview(
        user_id=user_id,
        synth_task_id=synth_task_id,
        status=status,
        correct=correct,
        verified=verified,
        notes=[],
    )


def _make_service(session: MockAsyncSession) -> TaskStatsService:
    return TaskStatsService(db_session=session)  # type: ignore[arg-type]


class TestAggregateUserReviews:
    def test_no_reviews_leaves_everything_unreviewed(self) -> None:
        agg = TaskStatsService._aggregate_user_reviews(
            [{"id": "g1"}, {"id": "g2"}], {}, admin_user_id=99
        )
        assert agg["reviewed_variants"] == 0
        assert agg["unreviewed_variants"] == 2
        assert agg["reviewer_ids"] == set()

    def test_incorrect_mark_counts_and_excludes_admin(self) -> None:
        tasks = [{"id": "g1"}]
        rows = {
            "g1": [
                _review(1, "g1", status="needs_revision", correct=False),
                _review(99, "g1", status="done"),
            ]
        }
        agg = TaskStatsService._aggregate_user_reviews(
            tasks, rows, admin_user_id=99
        )
        assert agg["reviewed_variants"] == 1
        assert agg["unreviewed_variants"] == 0
        assert agg["variants_with_incorrect_mark"] == 1
        assert agg["incorrect_marks"] == 1
        assert agg["correct_marks"] == 0
        assert agg["reviewer_ids"] == {1}

    def test_correct_and_incorrect_marks_on_same_variant(self) -> None:
        tasks = [{"id": "g1"}]
        rows = {
            "g1": [
                _review(1, "g1", status="done"),
                _review(2, "g1", status="needs_revision", correct=False),
            ]
        }
        agg = TaskStatsService._aggregate_user_reviews(tasks, rows, admin_user_id=99)
        assert agg["reviewer_ids"] == {1, 2}
        assert agg["variants_with_incorrect_mark"] == 1
        assert agg["variants_with_correct_mark"] == 1
        assert agg["incorrect_marks"] == 1
        assert agg["correct_marks"] == 1


class TestAggregateAdminReviews:
    def test_unreviewed_when_admin_has_no_rows(self) -> None:
        agg = TaskStatsService._aggregate_admin_reviews(
            [{"id": "g1"}], {}, admin_user_id=99
        )
        assert agg["status"] == "unreviewed"
        assert agg["reviewed_variants"] == 0

    def test_needs_revision_wins_over_done(self) -> None:
        tasks = [{"id": "g1"}, {"id": "g2"}]
        rows = {
            "g1": [_review(99, "g1", status="done", verified=True)],
            "g2": [_review(99, "g2", status="needs_revision")],
        }
        agg = TaskStatsService._aggregate_admin_reviews(tasks, rows, admin_user_id=99)
        assert agg["status"] == "needs_revision"
        assert agg["done_variants"] == 1
        assert agg["needs_revision_variants"] == 1
        assert agg["verified_variants"] == 1

    def test_done_when_all_terminal(self) -> None:
        tasks = [{"id": "g1"}, {"id": "g2"}]
        rows = {
            "g1": [_review(99, "g1", status="done")],
            "g2": [_review(99, "g2", status="done")],
        }
        agg = TaskStatsService._aggregate_admin_reviews(tasks, rows, admin_user_id=99)
        assert agg["status"] == "done"


class TestSearchReviewGroups:
    def _index(self, by_original: dict[str, list[dict]]):
        class _Idx:
            _by_original = by_original

        return _Idx()

    async def test_groups_with_user_and_admin_reviews(
        self, monkeypatch
    ) -> None:
        session = MockAsyncSession()
        service = _make_service(session)

        monkeypatch.setattr(
            task_stats_mod,
            "_get_cached_index",
            lambda: self._index(
                {
                    "00576224": [
                        {
                            "id": "gen_a",
                            "original_task_id": "00576224",
                            "model_name": "m1",
                            "witness_passed": True,
                            "timestamp": "t1",
                            "concept": "c1",
                        }
                    ],
                    "11111111": [
                        {
                            "id": "gen_b",
                            "original_task_id": "11111111",
                            "model_name": "m2",
                            "witness_passed": False,
                            "timestamp": "t2",
                        }
                    ],
                }
            ),
        )
        monkeypatch.setattr(
            service,
            "_load_all_task_dimensions",
            lambda: {
                "00576224": {"width": 5, "height": 5, "datasets": {"1_train"}},
                "11111111": {"width": 3, "height": 3, "datasets": {"2_train"}},
            },
        )
        monkeypatch.setattr(
            service,
            "_load_all_transform_info",
            lambda: {
                "00576224": {
                    "same_size": True,
                    "width_delta": 0,
                    "height_delta": 0,
                    "label": "same_size",
                    "all_inputs_same": True,
                    "all_outputs_same": True,
                },
                "11111111": {
                    "same_size": False,
                    "width_delta": 1,
                    "height_delta": 1,
                    "label": "expand_both",
                    "all_inputs_same": True,
                    "all_outputs_same": True,
                },
            },
        )

        session.set_execute_results(
            [
                MockResult(
                    scalars_all_result=[("00576224", 2, ["a@x.com"], [1, 2])]
                ),
                MockResult(scalars_all_result=[("00576224", 1, "hip a")]),
                MockResult(
                    scalars_all_result=[
                        _review(1, "gen_a", status="needs_revision", correct=False),
                        _review(99, "gen_a", status="done", verified=True),
                    ]
                ),
                MockResult(scalars_all_result=[(1, "a@x.com")]),
            ]
        )

        result = await service.search_review_groups(
            admin_user_id=99, user_review_status="any_incorrect"
        )
        assert result.total == 1
        item = result.items[0]
        assert item.original_task_id == "00576224"
        assert item.total_variants == 1
        assert item.witness_passed_count == 1
        assert item.models == ["m1"]
        assert item.concepts == ["c1"]
        assert item.solution_count == 2
        assert item.solvers[0].email == "a@x.com"
        assert item.solvers[0].hypothesis == "hip a"
        assert item.user_review.reviewed_variants == 1
        assert item.user_review.variants_with_incorrect_mark == 1
        assert item.user_review.reviewer_emails == ["a@x.com"]
        assert item.admin_review.status == "done"
        assert item.admin_review.verified_variants == 1

    async def test_unreviewed_filter_excludes_reviewed_groups(
        self, monkeypatch
    ) -> None:
        session = MockAsyncSession()
        service = _make_service(session)

        monkeypatch.setattr(
            task_stats_mod,
            "_get_cached_index",
            lambda: self._index(
                {
                    "00576224": [
                        {
                            "id": "gen_a",
                            "original_task_id": "00576224",
                            "model_name": "m1",
                            "witness_passed": True,
                            "timestamp": "t1",
                        }
                    ],
                    "11111111": [
                        {
                            "id": "gen_b",
                            "original_task_id": "11111111",
                            "model_name": "m2",
                            "witness_passed": False,
                            "timestamp": "t2",
                        }
                    ],
                }
            ),
        )
        monkeypatch.setattr(
            service,
            "_load_all_task_dimensions",
            lambda: {
                "00576224": {"width": 5, "height": 5, "datasets": {"1_train"}},
                "11111111": {"width": 3, "height": 3, "datasets": {"2_train"}},
            },
        )
        monkeypatch.setattr(
            service,
            "_load_all_transform_info",
            lambda: {
                "00576224": {
                    "same_size": True,
                    "width_delta": 0,
                    "height_delta": 0,
                    "label": "same_size",
                    "all_inputs_same": True,
                    "all_outputs_same": True,
                },
                "11111111": {
                    "same_size": False,
                    "width_delta": 1,
                    "height_delta": 1,
                    "label": "expand_both",
                    "all_inputs_same": True,
                    "all_outputs_same": True,
                },
            },
        )

        session.set_execute_results(
            [
                MockResult(scalars_all_result=[]),
                MockResult(scalars_all_result=[]),
                MockResult(
                    scalars_all_result=[
                        _review(1, "gen_a", status="done"),
                    ]
                ),
                MockResult(scalars_all_result=[(1, "a@x.com")]),
            ]
        )

        result = await service.search_review_groups(
            admin_user_id=99, user_review_status="unreviewed"
        )
        assert result.total == 1
        assert result.items[0].original_task_id == "11111111"
