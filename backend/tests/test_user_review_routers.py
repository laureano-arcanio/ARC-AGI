from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import (
    ObjectNotFoundError,
    global_exception_handler,
    object_not_found_handler,
)
from app.routers.user_review import get_service, router
from app.schemas.user_review import (
    ReviewEntryProgress,
    SolverReviewDetail,
    SolverReviewVariant,
    UserReviewRead,
)
from app.services.user_review import UserReviewService


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=UserReviewService)
    svc.get_review.return_value = UserReviewRead(
        user_id=1, synth_task_id="gen_1", status="done"
    )
    svc.update_review.return_value = UserReviewRead(
        user_id=1, synth_task_id="gen_1", status="done", notes=["ok"]
    )
    svc.start_review.return_value = UserReviewRead(
        user_id=1, synth_task_id="gen_1", status="pending_review"
    )
    svc.list_for_user_tasks.return_value = [
        UserReviewRead(user_id=1, synth_task_id="gen_1", status="done")
    ]
    svc.get_solver_review_details.return_value = [
        SolverReviewDetail(
            user_id=7,
            email="a@b.com",
            original_hypothesis="hip original",
            revised_hypothesis="hip revisada",
            variants=[
                SolverReviewVariant(
                    synth_task_id="gen_a1",
                    status="done",
                    correct=False,
                    notes=["incorrecta"],
                )
            ],
        )
    ]
    return svc


@pytest.fixture
async def client(mock_service: AsyncMock) -> AsyncIterator[AsyncClient]:
    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="solver")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    application.dependency_overrides[get_current_user] = mock_get_current_user
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestUserReviewRouterGet:
    async def test_returns_review(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.get("/api/v1/user-reviews/gen_1")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["synthTaskId"] == "gen_1"
        mock_service.get_review.assert_awaited_once_with(1, "gen_1")


class TestUserReviewRouterStart:
    async def test_starts_review(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.post("/api/v1/user-reviews/gen_1/start")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["synthTaskId"] == "gen_1"
        mock_service.start_review.assert_awaited_once_with(1, "gen_1")


class TestUserReviewRouterUpdate:
    async def test_updates_review(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.put(
            "/api/v1/user-reviews/gen_1",
            json={"status": "done", "notes": ["ok"]},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["notes"] == ["ok"]
        mock_service.update_review.assert_awaited_once()


class TestUserReviewRouterList:
    async def test_lists_reviews_for_tasks(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.get(
            "/api/v1/user-reviews/tasks?taskIds=gen_1,gen_2"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 1
        mock_service.list_for_user_tasks.assert_awaited_once_with(
            1, ["gen_1", "gen_2"]
        )

    async def test_empty_task_ids(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.list_for_user_tasks.return_value = []
        response = await client.get("/api/v1/user-reviews/tasks")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
        mock_service.list_for_user_tasks.assert_awaited_once_with(1, [])


class TestUserReviewRouterProgress:
    async def test_returns_progress(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        mock_service.list_progress.return_value = [
            ReviewEntryProgress(
                entry_id="d35bdbdc",
                synth_task_ids=["gen_a1"],
                total=1,
                done=1,
                status="done",
            )
        ]
        response = await client.get(
            "/api/v1/user-reviews/progress?taskIds=d35bdbdc,46c35fc7"
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 1
        assert body[0]["entryId"] == "d35bdbdc"
        assert body[0]["status"] == "done"
        mock_service.list_progress.assert_awaited_once_with(
            1, ["d35bdbdc", "46c35fc7"]
        )


class TestUserReviewRouterSolverReviewDetails:
    @pytest.fixture
    async def admin_client(self, mock_service: AsyncMock) -> AsyncIterator[AsyncClient]:
        async def mock_admin_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="admin")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
        application.include_router(router)
        application.dependency_overrides[get_service] = lambda: mock_service
        application.dependency_overrides[get_current_user] = mock_admin_user
        transport = ASGITransport(app=application)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_returns_solver_reviews_for_original_task(
        self, admin_client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await admin_client.get(
            "/api/v1/user-reviews/by-original/d35bdbdc"
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 1
        assert body[0]["email"] == "a@b.com"
        assert body[0]["originalHypothesis"] == "hip original"
        assert body[0]["revisedHypothesis"] == "hip revisada"
        assert body[0]["variants"][0]["synthTaskId"] == "gen_a1"
        assert body[0]["variants"][0]["correct"] is False
        mock_service.get_solver_review_details.assert_awaited_once_with(
            "d35bdbdc"
        )

    async def test_denies_non_admin(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.get(
            "/api/v1/user-reviews/by-original/d35bdbdc"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_service.get_solver_review_details.assert_not_awaited()
