from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import sessionmanager
from app.errors import (
    ObjectNotFoundError,
    global_exception_handler,
    object_not_found_handler,
)
from app.models.user import User, UserRole
from app.routers import arc_task, event, example_table, user

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
app.exception_handler(Exception)(global_exception_handler)

app.include_router(event.router)
app.include_router(example_table.router)
app.include_router(user.router)
app.include_router(arc_task.router)


@app.on_event("startup")
async def seed_users() -> None:
    async with sessionmanager.session() as session:
        result = await session.execute(select(User).where(User.uuid == "987654"))
        if not result.scalar_one_or_none():
            existing = await session.execute(select(User).where(User.id == 1))
            admin = existing.scalar_one_or_none()
            if admin:
                admin.uuid = "987654"
                admin.role = UserRole.ADMIN
                session.add(admin)
            else:
                session.add(User(id=1, uuid="987654", role=UserRole.ADMIN))

        result2 = await session.execute(select(User).where(User.uuid == "123456"))
        if not result2.scalar_one_or_none():
            existing2 = await session.execute(select(User).where(User.id == 2))
            solver = existing2.scalar_one_or_none()
            if solver:
                solver.uuid = "123456"
                solver.role = UserRole.SOLVER
                session.add(solver)
            else:
                session.add(User(id=2, uuid="123456", role=UserRole.SOLVER))

        await session.commit()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": settings.PROJECT_NAME}
