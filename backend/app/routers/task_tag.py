from fastapi import APIRouter, Depends, status

from app.dependencies.auth import AdminDep
from app.dependencies.database import DatabaseSession
from app.repositories.task_tag import (
    TaskTagRelationRepository,
    TaskTagRepository,
)
from app.schemas.task_tag import (
    TaskTagCreate,
    TaskTagRead,
    TaskTagRelationCreate,
    TaskTagRelationRead,
    TaskTagUpdate,
)
from app.services.task_tag import TaskTagRelationService, TaskTagService

router = APIRouter(prefix="/api/v1/task-tags", tags=["task-tags"])


async def get_tag_service(
    db_session: DatabaseSession,
) -> TaskTagService:
    repository = TaskTagRepository(db_session=db_session)
    return TaskTagService(repository=repository)


async def get_relation_service(
    db_session: DatabaseSession,
) -> TaskTagRelationService:
    repository = TaskTagRelationRepository(db_session=db_session)
    return TaskTagRelationService(repository=repository)


@router.get("/{task_id}", response_model=list[TaskTagRead])
async def list_tags(
    task_id: str,
    service: TaskTagService = Depends(get_tag_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[TaskTagRead]:
    return await service.get_by_task_id(task_id)


@router.post(
    "",
    response_model=TaskTagRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_tag(
    data: TaskTagCreate,
    service: TaskTagService = Depends(get_tag_service),  # noqa: B008
    admin: AdminDep = None,  # type: ignore[assignment]
) -> TaskTagRead:
    return await service.create_tag(data, admin.user_id)


@router.put("/{tag_id}", response_model=TaskTagRead)
async def update_tag(
    tag_id: int,
    data: TaskTagUpdate,
    service: TaskTagService = Depends(get_tag_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> TaskTagRead:
    return await service.update(tag_id, data)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    service: TaskTagService = Depends(get_tag_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(tag_id)


@router.get(
    "/{task_id}/relations",
    response_model=list[TaskTagRelationRead],
)
async def list_relations(
    task_id: str,
    service: TaskTagRelationService = Depends(get_relation_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> list[TaskTagRelationRead]:
    return await service.get_by_task_id(task_id)


@router.post(
    "/{task_id}/relations",
    response_model=TaskTagRelationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_relation(
    task_id: str,  # noqa: ARG001
    data: TaskTagRelationCreate,
    service: TaskTagRelationService = Depends(get_relation_service),  # noqa: B008
    admin: AdminDep = None,  # type: ignore[assignment]
) -> TaskTagRelationRead:
    return await service.create_relation(data, admin.user_id)


@router.delete(
    "/relations/{relation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_relation(
    relation_id: int,
    service: TaskTagRelationService = Depends(get_relation_service),  # noqa: B008
    _admin: AdminDep = None,  # type: ignore[assignment]
) -> None:
    await service.delete(relation_id)
