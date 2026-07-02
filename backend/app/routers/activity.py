from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AdminDep
from app.dependencies.database import DatabaseSession
from app.repositories.event import EventRepository
from app.schemas.activity import ActivityStats
from app.services.activity import ActivityService

router = APIRouter(prefix="/api/v1/activity", tags=["activity"])


async def get_service(db_session: DatabaseSession) -> ActivityService:
    repo = EventRepository(db_session=db_session)
    return ActivityService(event_repo=repo)


@router.get("", response_model=ActivityStats)
async def get_activity_stats(
    event_types: str | None = Query(
        None, alias="eventTypes", description="Comma-separated trigger actions"
    ),
    service: ActivityService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ActivityStats:
    parsed: list[str] | None = None
    if event_types:
        parsed = [t.strip() for t in event_types.split(",") if t.strip()]
    return await service.get_stats(event_types=parsed)
