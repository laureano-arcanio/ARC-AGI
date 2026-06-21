import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Backend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "dev-secret-key-change-in-production-32chars"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    def get_database_url(self) -> str:
        """
        Get the database URL from environment variables.

        Returns:
            str: The database URL.

        Raises:
            ValueError: If the DATABASE_URL environment variable is not set.
        """
        database_url = os.getenv("DATABASE_URL")

        if database_url is None:
            raise ValueError("DATABASE_URL environment variable not set")

        return database_url


settings = Settings()
