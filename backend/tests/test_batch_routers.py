from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.routers.batch import get_batch_service, router
from app.schemas.batch import BatchRead
from app.services.batch import BatchService


@pytest.fixture
def mock_service() -> AsyncMock:
    svc = AsyncMock(spec=BatchService)
    svc.get_batches_for_user.return_value = [
        BatchRead(
            id=2,
            name="Reviews",
            task_ids=["gen_1"],
            batch_type="review",
        )
    ]
    return svc


@pytest.fixture
async def client(mock_service: AsyncMock) -> AsyncIterator[AsyncClient]:
    async def mock_get_current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="solver")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_batch_service] = lambda: mock_service
    application.dependency_overrides[get_current_user] = mock_get_current_user
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestBatchRouterUserBatches:
    async def test_filters_by_type(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        response = await client.get("/api/v1/batches/user/1?type=review")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()[0]["batchType"] == "review"
        mock_service.get_batches_for_user.assert_awaited_once_with(
            1, batch_type="review"
        )

    async def test_returns_solver_batches_without_type(
        self, client: AsyncClient, mock_service: AsyncMock
    ) -> None:
        await client.get("/api/v1/batches/user/1")
        mock_service.get_batches_for_user.assert_awaited_once_with(
            1, batch_type=None
        )

    async def test_denies_other_user(self) -> None:
        application = FastAPI()
        application.exception_handler(Exception)(global_exception_handler)
        application.include_router(router)

        async def mock_get_current_user() -> CurrentUser:
            return CurrentUser(user_id=2, role="solver")

        application.dependency_overrides[get_current_user] = (
            mock_get_current_user
        )
        transport = ASGITransport(app=application)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/batches/user/1")
        assert response.status_code == status.HTTP_403_FORBIDDEN
