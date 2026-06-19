from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import (
    ObjectNotFoundError,
    global_exception_handler,
    object_not_found_handler,
)
from app.routers import example_table

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

app.include_router(example_table.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": settings.PROJECT_NAME}
