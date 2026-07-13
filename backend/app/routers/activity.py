from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.dependencies.auth import AdminDep
from app.dependencies.database import DatabaseSession
from app.repositories.event import EventRepository
from app.schemas.activity import (
    ActivityBatchBreakdown,
    ActivityStats,
    ActivitySummary,
)
from app.services.activity import ActivityService
from app.services.arc_task import ArcTaskService

router = APIRouter(prefix="/api/v1/activity", tags=["activity"])


async def get_service(db_session: DatabaseSession) -> ActivityService:
    repo = EventRepository(db_session=db_session)
    return ActivityService(event_repo=repo)


async def get_arc_task_service() -> ArcTaskService:
    return ArcTaskService()


@router.get("", response_model=ActivityStats)
async def get_activity_stats(
    event_types: str | None = Query(
        None, alias="eventTypes", description="Comma-separated trigger actions"
    ),
    hours: int = Query(
        24, alias="hours", description="Time window in hours (4, 8, 12, 24, 48, 72)"
    ),
    service: ActivityService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ActivityStats:
    parsed: list[str] | None = None
    if event_types:
        parsed = [t.strip() for t in event_types.split(",") if t.strip()]
    return await service.get_stats(event_types=parsed, hours=hours)


@router.get("/summary", response_model=ActivitySummary)
async def get_activity_summary(
    service: ActivityService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ActivitySummary:
    return await service.get_summary()


@router.get("/batch-breakdown", response_model=ActivityBatchBreakdown)
async def get_batch_breakdown(
    service: ActivityService = Depends(get_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> ActivityBatchBreakdown:
    return await service.get_batch_breakdown()


@router.get("/export")
async def export_dataset(
    service: ActivityService = Depends(get_service),  # noqa: B008
    arc_task_service: ArcTaskService = Depends(get_arc_task_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> StreamingResponse:
    return StreamingResponse(
        service.get_export_dataset(arc_task_service),
        media_type="application/jsonl",
        headers={
            "Content-Disposition": (
                'attachment; filename="arc-tasks-dataset.jsonl"'
            ),
        },
    )
