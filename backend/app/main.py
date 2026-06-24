from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import sessionmanager
from app.errors import (
    DuplicateEmailError,
    InvalidCredentialsError,
    ObjectNotFoundError,
    duplicate_email_handler,
    global_exception_handler,
    invalid_credentials_handler,
    object_not_found_handler,
)
from app.models.user import User, UserRole
from app.routers import arc_task, attempt, batch, event, example_table, review, user
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


app.exception_handler(DuplicateEmailError)(duplicate_email_handler)
app.exception_handler(ObjectNotFoundError)(object_not_found_handler)
app.exception_handler(InvalidCredentialsError)(invalid_credentials_handler)
app.exception_handler(Exception)(global_exception_handler)

app.include_router(attempt.router)
app.include_router(batch.router)
app.include_router(event.router)
app.include_router(example_table.router)
app.include_router(review.router)
app.include_router(user.router)
app.include_router(arc_task.router)


@app.on_event("startup")
async def seed_users() -> None:
    async with sessionmanager.session() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@arc.com")
        )
        if not result.scalar_one_or_none():
            existing = await session.execute(select(User).where(User.id == 1))
            admin = existing.scalar_one_or_none()
            if admin:
                admin.email = "admin@arc.com"
                admin.password_hash = _hash_password("admin")
                admin.role = UserRole.ADMIN
                session.add(admin)
            else:
                session.add(
                    User(
                        id=1,
                        email="admin@arc.com",
                        password_hash=_hash_password("admin"),
                        role=UserRole.ADMIN,
                    )
                )

        result2 = await session.execute(
            select(User).where(User.email == "solver@arc.com")
        )
        if not result2.scalar_one_or_none():
            existing2 = await session.execute(select(User).where(User.id == 2))
            solver = existing2.scalar_one_or_none()
            if solver:
                solver.email = "solver@arc.com"
                solver.password_hash = _hash_password("solver")
                solver.role = UserRole.SOLVER
                session.add(solver)
            else:
                session.add(
                    User(
                        id=2,
                        email="solver@arc.com",
                        password_hash=_hash_password("solver"),
                        role=UserRole.SOLVER,
                    )
                )

        await session.commit()

        # Reset auto-increment sequence to avoid collision with manual id inserts
        from sqlalchemy import text

        await session.execute(
            text(
                "SELECT setval("
                "pg_get_serial_sequence('\"user\"', 'id'), "
                "COALESCE((SELECT MAX(id) FROM \"user\"), 1)"
                ")"
            )
        )
        await session.commit()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": settings.PROJECT_NAME}
