from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.errors.object_not_found_error import ObjectNotFoundError


async def object_not_found_handler(
    _request: Request, exc: ObjectNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"message": exc.message},
    )
