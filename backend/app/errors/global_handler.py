import os
import sys
import traceback
from typing import Any

import structlog
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = structlog.stdlib.get_logger(__name__)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for the FastAPI application.

    Catches all unhandled exceptions, logs them with contextual information,
    reports them to Sentry, and returns a standardized error response.

    Args:
        request (Request): The FastAPI request object that caused the exception
        exc (Exception): The unhandled exception that was raised

    Returns:
        JSONResponse: A standardized error response containing:
            - error_id: Correlation ID for tracking
            - message: User-friendly error message (detailed in development)
            - debug_info: Additional details in development environment

    Note:
        In development mode (ENVIRONMENT=local), the response includes detailed
        error information including traceback. In production, error details
        are omitted from the response but still logged to Sentry.
    """
    error_id = request.headers.get("X-Correlation-ID", "unknown")

    # Get the full exception traceback
    exc_type, exc_value, exc_traceback = sys.exc_info()
    traceback_details = "".join(
        traceback.format_exception(exc_type, exc_value, exc_traceback)
    )

    # Extract request information
    request_info = {
        "method": request.method,
        "url": str(request.url),
        "client_host": request.client.host if request.client else "unknown",
        "path": request.url.path,
    }

    # Log the error with structured context
    # The SentryProcessor configured in logging.py will handle sending to Sentry
    # No need to call sentry_sdk.capture_exception() separately
    logger.error(
        "Unhandled exception caught by global handler",
        error_id=error_id,
        request=request_info,
        exception_type=exc.__class__.__name__,
        exception_detail=str(exc),
    )

    # Determine if we're in development mode
    is_development = os.getenv("ENVIRONMENT") == "local"

    # Prepare the error response
    error_response: dict[str, Any] = {
        "error": {
            "type": "internal_server_error",
            "message": str(exc) if is_development else "An unexpected error occurred",
            "error_id": error_id,
        }
    }

    # Add debug information in development mode
    if is_development:
        error_response["error"]["debug_info"] = {
            "exception_type": exc.__class__.__name__,
            "traceback": traceback_details,
        }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
    )
