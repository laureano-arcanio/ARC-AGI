import hashlib
import os

from app.dependencies.auth import _create_token
from app.errors import InvalidCredentialsError, ObjectNotFoundError
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import LoginResponse, UserCreate, UserRead, UserUpdate
from app.services.base_service import BaseService


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return salt.hex() + ":" + pwd_hash.hex()


def _verify_password(password: str, stored: str) -> bool:
    salt_hex, pwd_hash_hex = stored.split(":", 1)
    salt = bytes.fromhex(salt_hex)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return pwd_hash.hex() == pwd_hash_hex


class UserService(
    BaseService[User, UserCreate, UserUpdate, UserRead]
):
    repository: UserRepository
    read_schema = UserRead

    async def create(self, data: UserCreate) -> UserRead:
        db_data = {
            "email": data.email,
            "password_hash": _hash_password(data.password),
            "role": data.role,
        }
        instance = await self.repository.create(db_data)
        return self.read_schema.model_validate(instance)

    async def authenticate(self, email: str, password: str) -> LoginResponse:
        try:
            instance = await self.repository.get_by_email(email)
        except ObjectNotFoundError as err:
            raise InvalidCredentialsError() from err
        if not _verify_password(password, instance.password_hash):
            raise InvalidCredentialsError()
        user = self.read_schema.model_validate(instance)
        token = _create_token(instance.id, instance.role)
        return LoginResponse(access_token=token, user=user)
