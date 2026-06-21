from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import sessionmanager
from app.errors import (
    InvalidCredentialsError,
    ObjectNotFoundError,
    global_exception_handler,
    invalid_credentials_handler,
    object_not_found_handler,
)
from app.models.batch import Batch, BatchAssignment
from app.models.user import User, UserRole
from app.routers import arc_task, attempt, batch, event, example_table, user
from app.services.user import _hash_password

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.exception_handler(ObjectNotFoundError)(object_not_found_handler)
app.exception_handler(InvalidCredentialsError)(invalid_credentials_handler)
app.exception_handler(Exception)(global_exception_handler)

app.include_router(attempt.router)
app.include_router(batch.router)
app.include_router(event.router)
app.include_router(example_table.router)
app.include_router(user.router)
app.include_router(arc_task.router)


@app.on_event("startup")
async def seed_users() -> None:
    async with sessionmanager.session() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@arc-agi.local")
        )
        if not result.scalar_one_or_none():
            existing = await session.execute(select(User).where(User.id == 1))
            admin = existing.scalar_one_or_none()
            if admin:
                admin.email = "admin@arc-agi.local"
                admin.password_hash = _hash_password("admin")
                admin.role = UserRole.ADMIN
                session.add(admin)
            else:
                session.add(
                    User(
                        id=1,
                        email="admin@arc-agi.local",
                        password_hash=_hash_password("admin"),
                        role=UserRole.ADMIN,
                    )
                )

        result2 = await session.execute(
            select(User).where(User.email == "solver@arc-agi.local")
        )
        if not result2.scalar_one_or_none():
            existing2 = await session.execute(select(User).where(User.id == 2))
            solver = existing2.scalar_one_or_none()
            if solver:
                solver.email = "solver@arc-agi.local"
                solver.password_hash = _hash_password("solver")
                solver.role = UserRole.SOLVER
                session.add(solver)
            else:
                session.add(
                    User(
                        id=2,
                        email="solver@arc-agi.local",
                        password_hash=_hash_password("solver"),
                        role=UserRole.SOLVER,
                    )
                )

        await session.flush()

        result_batch = await session.execute(
            select(Batch).where(Batch.name == "Default Batch")
        )
        if not result_batch.scalar_one_or_none():
            batch = Batch(
                id=1,
                name="Default Batch",
                task_ids=[
                    "007bbfb7",
                    "00d62c1b",
                    "017c7c7b",
                    "025d127b",
                    "045e512c",
                ],
            )
            session.add(batch)
            await session.flush()

            result_assignment = await session.execute(
                select(BatchAssignment).where(
                    BatchAssignment.batch_id == 1,
                    BatchAssignment.user_id == 2,
                )
            )
            if not result_assignment.scalar_one_or_none():
                session.add(
                    BatchAssignment(id=1, batch_id=1, user_id=2)
                )

        await session.commit()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": settings.PROJECT_NAME}
