from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import CurrentUser, get_current_user
from app.errors import global_exception_handler
from app.models.attempt import Attempt
from app.repositories.attempt import AttemptRepository
from app.repositories.batch import BatchRepository
from app.routers.event import (
    get_arc_task_service,
    get_attempt_repo,
    get_batch_repo,
    get_service,
    router,
)
from app.schemas.event import EventRead
from app.services.arc_task import ArcTaskService
from app.services.event import EventService


def _event_read(trigger: dict) -> EventRead:
    return EventRead(
        id=1,
        user_id=1,
        task_id="t1",
        attempt_id=5,
        node_id="node_003",
        parent_node_id="node_002",
        test_pair_index=0,
        trigger=trigger,
        state_snapshot=[[1]],
        timestamp=1,
    )


@pytest.fixture
def mocks() -> dict:
    service = AsyncMock(spec=EventService)
    service.create.side_effect = lambda data: _event_read(data.trigger)

    batch_repo = AsyncMock(spec=BatchRepository)
    batch_repo.user_has_access.return_value = True

    attempt_repo = AsyncMock(spec=AttemptRepository)
    attempt_repo.get_by_id.return_value = Attempt(id=5, user_id=1, task_id="t1")

    arc_task_service = AsyncMock(spec=ArcTaskService)
    arc_task_service.check_submission.return_value = True

    return {
        "service": service,
        "batch_repo": batch_repo,
        "attempt_repo": attempt_repo,
        "arc_task_service": arc_task_service,
    }


@pytest.fixture
def app(mocks: dict) -> FastAPI:
    async def current_user() -> CurrentUser:
        return CurrentUser(user_id=1, role="solver")

    application = FastAPI()
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mocks["service"]
    application.dependency_overrides[get_batch_repo] = lambda: mocks["batch_repo"]
    application.dependency_overrides[get_attempt_repo] = lambda: mocks["attempt_repo"]
    application.dependency_overrides[get_arc_task_service] = (
        lambda: mocks["arc_task_service"]
    )
    application.dependency_overrides[get_current_user] = current_user
    return application


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _event_body(**overrides) -> dict:
    body = {
        "userId": 1,
        "taskId": "t1",
        "attemptId": 5,
        "nodeId": "node_003",
        "parentNodeId": "node_002",
        "testPairIndex": 0,
        "trigger": {"kind": "cognitive", "intent": "initial_hypothesis", "text": "x"},
        "stateSnapshot": [[1]],
        "timestamp": 1,
    }
    body.update(overrides)
    return body


class TestEventCreate:
    async def test_rejects_client_submit_events(
        self, client: AsyncClient
    ) -> None:
        body = _event_body(
            trigger={"kind": "mechanical", "action": "submit",
                     "details": {"correct": True}},
        )
        response = await client.post("/api/v1/events/", json=body)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def test_rejects_attempt_owned_by_other_user(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["attempt_repo"].get_by_id.return_value = Attempt(
            id=5, user_id=999, task_id="t1"
        )
        response = await client.post("/api/v1/events/", json=_event_body())
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_rejects_attempt_for_other_task(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["attempt_repo"].get_by_id.return_value = Attempt(
            id=5, user_id=1, task_id="other"
        )
        response = await client.post("/api/v1/events/", json=_event_body())
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_accepts_valid_event(self, client: AsyncClient) -> None:
        response = await client.post("/api/v1/events/", json=_event_body())
        assert response.status_code == status.HTTP_201_CREATED


def _submit_body(**overrides) -> dict:
    body = {
        "userId": 1,
        "taskId": "t1",
        "attemptId": 5,
        "nodeId": "node_010",
        "parentNodeId": "node_009",
        "testPairIndex": 0,
        "grids": {"0": [[4]]},
        "stateSnapshot": [[4]],
        "timestamp": 1,
    }
    body.update(overrides)
    return body


class TestEventSubmit:
    async def test_records_server_computed_correct(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["arc_task_service"].check_submission.return_value = True
        response = await client.post("/api/v1/events/submit", json=_submit_body())
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["trigger"]["details"]["correct"] is True

    async def test_ignores_wrong_submission(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["arc_task_service"].check_submission.return_value = False
        response = await client.post("/api/v1/events/submit", json=_submit_body())
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["trigger"]["details"]["correct"] is False

    async def test_rejects_attempt_owned_by_other_user(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["attempt_repo"].get_by_id.return_value = Attempt(
            id=5, user_id=999, task_id="t1"
        )
        response = await client.post("/api/v1/events/submit", json=_submit_body())
        assert response.status_code == status.HTTP_403_FORBIDDEN

    async def test_denies_when_no_task_access(
        self, client: AsyncClient, mocks: dict
    ) -> None:
        mocks["batch_repo"].user_has_access.return_value = False
        response = await client.post("/api/v1/events/submit", json=_submit_body())
        assert response.status_code == status.HTTP_403_FORBIDDEN
