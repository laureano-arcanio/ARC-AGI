from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.errors.duplicate_email_error import DuplicateEmailError
from app.errors.invalid_credentials_error import InvalidCredentialsError
from app.errors.object_not_found_error import ObjectNotFoundError


async def object_not_found_handler(
    _request: Request, exc: ObjectNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"message": exc.message},
    )


async def invalid_credentials_handler(
    _request: Request, exc: InvalidCredentialsError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"message": exc.message},
    )


async def duplicate_email_handler(
    _request: Request, exc: DuplicateEmailError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"message": exc.message},
    )
