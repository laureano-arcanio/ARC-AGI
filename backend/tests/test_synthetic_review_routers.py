from unittest.mock import AsyncMock

from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.repositories.batch import BatchRepository
from app.routers.synthetic_review import (
    get_batch_repo,
    get_review_service,
    get_service,
    router,
)
from app.schemas.synthetic_review import SyntheticTaskRead
from app.schemas.user_review import UserReviewRead
from app.services.synthetic_task import SyntheticTaskService
from app.services.user_review import UserReviewService


def _task() -> SyntheticTaskRead:
    return SyntheticTaskRead(
        id="gen_1",
        original_task_id="54dc2872",
        model_name="gpt-5.6-sol-medium-direct",
        witness_passed=True,
        train=[{"input": [[1]], "output": [[2]]}],
        test=[{"input": [[3]], "output": [[4]]}],
    )


def _build_app(role: str, has_review_access: bool) -> FastAPI:
    service = AsyncMock(spec=SyntheticTaskService)
    service.get_task.return_value = _task()

    batch_repo = AsyncMock(spec=BatchRepository)
    batch_repo.user_has_review_access.return_value = has_review_access

    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role=role)

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: service
    application.dependency_overrides[get_batch_repo] = lambda: batch_repo
    application.dependency_overrides[get_current_user] = mock_get_current_user
    return application


async def _get_task(application: FastAPI, task_id: str = "gen_1"):
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(f"/api/v1/synthetic-tasks/{task_id}")


class TestSyntheticTaskRouterAccess:
    async def test_admin_allowed(self) -> None:
        response = await _get_task(_build_app(role="admin", has_review_access=False))
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == "gen_1"

    async def test_reviewer_with_access_allowed(self) -> None:
        response = await _get_task(
            _build_app(role="solver", has_review_access=True)
        )
        assert response.status_code == status.HTTP_200_OK

    async def test_solver_without_access_denied(self) -> None:
        response = await _get_task(
            _build_app(role="solver", has_review_access=False)
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


async def _resolve(application: FastAPI, entry_id: str = "d35bdbdc"):
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(
            f"/api/v1/synthetic-tasks/resolve/{entry_id}"
        )


class TestSyntheticTaskResolveEndpoint:
    async def test_admin_allowed(self) -> None:
        service = AsyncMock(spec=SyntheticTaskService)
        service.resolve_entry.return_value = [_task()]
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.user_has_review_access.return_value = False

        async def mock_get_current_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="admin")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)
        application.dependency_overrides[get_service] = lambda: service
        application.dependency_overrides[get_batch_repo] = lambda: batch_repo
        application.dependency_overrides[get_current_user] = mock_get_current_user

        response = await _resolve(application)
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert isinstance(body, list)
        assert body[0]["id"] == "gen_1"
        service.resolve_entry.assert_called_once_with("d35bdbdc")

    async def test_reviewer_with_access_allowed(self) -> None:
        service = AsyncMock(spec=SyntheticTaskService)
        service.resolve_entry.return_value = [_task()]
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.user_has_review_access.return_value = True

        async def mock_get_current_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="solver")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)
        application.dependency_overrides[get_service] = lambda: service
        application.dependency_overrides[get_batch_repo] = lambda: batch_repo
        application.dependency_overrides[get_current_user] = mock_get_current_user

        response = await _resolve(application)
        assert response.status_code == status.HTTP_200_OK
        batch_repo.user_has_review_access.assert_awaited_once_with(1, "d35bdbdc")

    async def test_solver_without_access_denied(self) -> None:
        service = AsyncMock(spec=SyntheticTaskService)
        batch_repo = AsyncMock(spec=BatchRepository)
        batch_repo.user_has_review_access.return_value = False

        async def mock_get_current_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="solver")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)
        application.dependency_overrides[get_service] = lambda: service
        application.dependency_overrides[get_batch_repo] = lambda: batch_repo
        application.dependency_overrides[get_current_user] = mock_get_current_user

        response = await _resolve(application)
        assert response.status_code == status.HTTP_403_FORBIDDEN


def _build_admin_app(review_service: AsyncMock) -> FastAPI:
    async def mock_admin_user() -> CurrentUser:
        return CurrentUser(user_id=99, role="admin")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_review_service] = lambda: review_service
    application.dependency_overrides[get_current_user] = mock_admin_user
    return application


async def _get_review(application: FastAPI, task_id: str = "gen_1"):
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(f"/api/v1/synthetic-tasks/{task_id}/review")


async def _put_review(
    application: FastAPI, task_id: str = "gen_1", body: dict | None = None
):
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.put(
            f"/api/v1/synthetic-tasks/{task_id}/review",
            json=body or {"status": "needs_revision", "verified": True},
        )


class TestAdminReviewEndpoints:
    async def test_get_returns_admin_review(self) -> None:
        review_service = AsyncMock(spec=UserReviewService)
        review_service.get_admin_review.return_value = UserReviewRead(
            user_id=99, synth_task_id="gen_1", status="done", verified=True
        )
        response = await _get_review(_build_admin_app(review_service))
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body == {
            "synthTaskId": "gen_1",
            "status": "done",
            "correct": None,
            "verified": True,
            "notes": [],
        }
        review_service.get_admin_review.assert_awaited_once_with(99, "gen_1")

    async def test_put_updates_admin_review(self) -> None:
        review_service = AsyncMock(spec=UserReviewService)
        review_service.update_admin_review.return_value = UserReviewRead(
            user_id=99,
            synth_task_id="gen_1",
            status="needs_revision",
            correct=False,
            verified=True,
            notes=["incorrecta"],
        )
        response = await _put_review(_build_admin_app(review_service))
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "needs_revision"
        assert body["correct"] is False
        assert body["verified"] is True
        assert body["notes"] == ["incorrecta"]
        review_service.update_admin_review.assert_awaited_once()

    async def test_denies_non_admin(self) -> None:
        review_service = AsyncMock(spec=UserReviewService)

        async def mock_solver_user() -> CurrentUser:
            return CurrentUser(user_id=1, role="solver")

        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)
        application.dependency_overrides[get_review_service] = lambda: review_service
        application.dependency_overrides[get_current_user] = mock_solver_user

        response = await _get_review(application)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        review_service.get_admin_review.assert_not_awaited()
