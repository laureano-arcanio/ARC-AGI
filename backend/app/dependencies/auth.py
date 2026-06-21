import time
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

security = HTTPBearer()


class CurrentUser:
    def __init__(self, user_id: int, role: str) -> None:
        self.user_id = user_id
        self.role = role


def _create_token(user_id: int, role: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),  # noqa: B008
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
    except jwt.PyJWTError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from err
    user_id = payload.get("sub")
    role = payload.get("role")
    if user_id is None or role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return CurrentUser(user_id=int(user_id), role=role)


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),  # noqa: B008
) -> CurrentUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin required",
        )
    return current_user


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
AdminDep = Annotated[CurrentUser, Depends(require_admin)]


def require_owner_or_admin(
    user_id: int,
    current_user: CurrentUser,
) -> None:
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
