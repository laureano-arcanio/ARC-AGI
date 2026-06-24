from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import AsyncClient

from app.errors import (
    ObjectNotFoundError,
    global_exception_handler,
    object_not_found_handler,
)
from app.routers.review import (
    get_pair_service,
    get_review_service,
    get_tag_service,
    router,
)
from app.schemas.review import PeerReviewPairRead, ReviewRead, ReviewTagRead


@pytest.fixture
def pair_app(mock_pair_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import get_current_user, require_admin

    async def mock_admin():
        from app.dependencies.auth import CurrentUser
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_pair_service] = lambda: mock_pair_service
    application.dependency_overrides[get_current_user] = mock_admin
    application.dependency_overrides[require_admin] = mock_admin
    return application


@pytest.fixture
def mock_pair_service() -> AsyncMock:
    svc = AsyncMock()
    svc.get_all.return_value = []
    svc.get_all_with_users.return_value = []
    svc.get_by_id.side_effect = ObjectNotFoundError("PeerReviewPair", 0)
    svc.create.return_value = PeerReviewPairRead(id=1, solver_a_id=1, solver_b_id=2)
    svc.delete.side_effect = ObjectNotFoundError("PeerReviewPair", 0)
    return svc


@pytest.fixture
async def pair_client(pair_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport
    transport = ASGITransport(app=pair_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestReviewPairRouterCreate:
    async def test_creates_and_returns_201(
        self, pair_client: AsyncClient, mock_pair_service: AsyncMock
    ) -> None:
        response = await pair_client.post(
            "/api/v1/reviews/pairs",
            json={"solverAId": 1, "solverBId": 2},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["solverAId"] == 1
        assert response.json()["solverBId"] == 2
        mock_pair_service.create.assert_awaited_once()

    async def test_returns_422_on_missing_fields(
        self, pair_client: AsyncClient
    ) -> None:
        response = await pair_client.post(
            "/api/v1/reviews/pairs",
            json={"solverAId": 1},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestReviewPairRouterList:
    async def test_returns_empty_list(
        self, pair_client: AsyncClient
    ) -> None:
        response = await pair_client.get("/api/v1/reviews/pairs")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    async def test_returns_list(
        self, pair_client: AsyncClient, mock_pair_service: AsyncMock
    ) -> None:
        mock_pair_service.get_all_with_users.return_value = [
            PeerReviewPairRead(id=1, solver_a_id=1, solver_b_id=2),
        ]
        response = await pair_client.get("/api/v1/reviews/pairs")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["solverAId"] == 1


class TestReviewPairRouterDelete:
    async def test_deletes_and_returns_204(
        self, pair_client: AsyncClient, mock_pair_service: AsyncMock
    ) -> None:
        mock_pair_service.delete.side_effect = None
        mock_pair_service.delete.return_value = None
        response = await pair_client.delete("/api/v1/reviews/pairs/1")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_pair_service.delete.assert_awaited_with(1)

    async def test_returns_404_when_not_found(
        self, pair_client: AsyncClient
    ) -> None:
        response = await pair_client.delete("/api/v1/reviews/pairs/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# --- Review endpoints ---


@pytest.fixture
def review_app(mock_review_service: AsyncMock) -> FastAPI:
    from app.dependencies.auth import get_current_user, require_admin

    async def mock_owner():
        from app.dependencies.auth import CurrentUser
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_review_service] = lambda: mock_review_service
    application.dependency_overrides[get_current_user] = mock_owner
    application.dependency_overrides[require_admin] = mock_owner
    return application


@pytest.fixture
def mock_review_service() -> AsyncMock:
    svc = AsyncMock()
    svc.get_by_id.side_effect = ObjectNotFoundError("Review", 0)
    svc.get_or_create.return_value = ReviewRead(
        id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned"
    )
    svc.get_pending_reviews.return_value = []
    svc.get_review_by_solver_and_task.return_value = []
    svc.update.side_effect = ObjectNotFoundError("Review", 0)
    return svc


@pytest.fixture
async def review_client(review_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport
    transport = ASGITransport(app=review_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestReviewRouterGetPending:
    async def test_returns_empty_list(
        self, review_client: AsyncClient
    ) -> None:
        response = await review_client.get("/api/v1/reviews/pending/1")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    async def test_returns_list(
        self, review_client: AsyncClient, mock_review_service: AsyncMock
    ) -> None:
        from app.schemas.review import ReviewTaskSummary
        mock_review_service.get_pending_reviews.return_value = [
            ReviewTaskSummary(
                task_id="abc", solver_id=2,
                attempt_count=0, solved=False, status="not_started",
            ),
        ]
        response = await review_client.get("/api/v1/reviews/pending/1")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["taskId"] == "abc"


class TestReviewRouterCreate:
    async def test_creates_and_returns_201(
        self, review_client: AsyncClient, mock_review_service: AsyncMock
    ) -> None:
        response = await review_client.post(
            "/api/v1/reviews/",
            json={"reviewerId": 1, "solverId": 2, "taskId": "abc"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == 1
        assert data["reviewerId"] == 1
        mock_review_service.get_or_create.assert_awaited_once()


class TestReviewRouterGetById:
    async def test_returns_review(
        self, review_client: AsyncClient, mock_review_service: AsyncMock
    ) -> None:
        mock_review_service.get_by_id.side_effect = None
        mock_review_service.get_by_id.return_value = ReviewRead(
            id=5, reviewer_id=1, solver_id=2, task_id="abc", status="completed"
        )
        response = await review_client.get("/api/v1/reviews/5")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "completed"

    async def test_returns_404_when_not_found(
        self, review_client: AsyncClient
    ) -> None:
        response = await review_client.get("/api/v1/reviews/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestReviewRouterUpdate:
    async def test_updates_and_returns_200(
        self, review_client: AsyncClient, mock_review_service: AsyncMock
    ) -> None:
        mock_review_service.get_by_id.side_effect = None
        mock_review_service.get_by_id.return_value = ReviewRead(
            id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned"
        )
        mock_review_service.update.side_effect = None
        mock_review_service.update.return_value = ReviewRead(
            id=1, reviewer_id=1, solver_id=2, task_id="abc", status="completed"
        )
        response = await review_client.put(
            "/api/v1/reviews/1", json={"status": "completed"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "completed"


class TestReviewRouterGetBySolverAndTask:
    async def test_returns_list(
        self, review_client: AsyncClient, mock_review_service: AsyncMock
    ) -> None:
        mock_review_service.get_review_by_solver_and_task.return_value = [
            ReviewRead(
                id=1, reviewer_id=1, solver_id=2, task_id="abc",
                status="completed",
            ),
        ]
        response = await review_client.get(
            "/api/v1/reviews/solver/2/task/abc"
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "completed"


# --- Tag endpoints ---


@pytest.fixture
def tag_app(mock_tag_service: AsyncMock, mock_review_svc: AsyncMock) -> FastAPI:
    from app.dependencies.auth import get_current_user, require_admin

    async def mock_owner():
        from app.dependencies.auth import CurrentUser
        return CurrentUser(user_id=1, role="admin")

    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_tag_service] = lambda: mock_tag_service
    application.dependency_overrides[get_review_service] = lambda: mock_review_svc
    application.dependency_overrides[get_current_user] = mock_owner
    application.dependency_overrides[require_admin] = mock_owner
    return application


@pytest.fixture
def mock_tag_service() -> AsyncMock:
    svc = AsyncMock()
    svc.get_by_review.return_value = []
    svc.create_tag.return_value = ReviewTagRead(
        id=1, review_id=1, solver_node_id="node_001", quality="good"
    )
    svc.delete_tag.return_value = None
    svc.create.side_effect = (
        lambda d: ReviewTagRead(id=2, review_id=1, **d.model_dump())
    )
    return svc


@pytest.fixture
def mock_review_svc() -> AsyncMock:
    svc = AsyncMock()
    svc.get_by_id.return_value = ReviewRead(
        id=1, reviewer_id=1, solver_id=2, task_id="abc", status="assigned"
    )
    return svc


@pytest.fixture
async def tag_client(tag_app: FastAPI) -> AsyncIterator[AsyncClient]:
    from httpx import ASGITransport
    transport = ASGITransport(app=tag_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestReviewTagRouterList:
    async def test_returns_empty_list(
        self, tag_client: AsyncClient
    ) -> None:
        response = await tag_client.get("/api/v1/reviews/1/tags")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    async def test_returns_list(
        self, tag_client: AsyncClient, mock_tag_service: AsyncMock
    ) -> None:
        mock_tag_service.get_by_review.return_value = [
            ReviewTagRead(id=1, review_id=1, solver_node_id="node_001", quality="good"),
        ]
        response = await tag_client.get("/api/v1/reviews/1/tags")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["quality"] == "good"


class TestReviewTagRouterCreate:
    async def test_creates_and_returns_201(
        self, tag_client: AsyncClient, mock_tag_service: AsyncMock
    ) -> None:
        response = await tag_client.post(
            "/api/v1/reviews/1/tags",
            json={"solverNodeId": "node_001", "quality": "good"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["quality"] == "good"
        mock_tag_service.create_tag.assert_awaited_once()


class TestReviewTagRouterDelete:
    async def test_deletes_and_returns_204(
        self, tag_client: AsyncClient, mock_tag_service: AsyncMock
    ) -> None:
        mock_tag_service.delete_tag.return_value = None
        response = await tag_client.delete("/api/v1/reviews/1/tags/1")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_tag_service.delete_tag.assert_awaited_with(1)
