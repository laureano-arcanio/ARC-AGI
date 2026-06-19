from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from pgvector.asyncpg import register_vector
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.history_meta import versioned_session

# Based on https://medium.com/@tclaitken/setting-up-a-fastapi-app-with-async-sqlalchemy-2-0-pydantic-v2-e6c540be4308
# Heavily inspired by https://praciano.com.br/fastapi-and-async-sqlalchemy-20-with-pytest-done-right.html


class DatabaseSessionManager:
    """
    Manages database sessions and connections for async SQLAlchemy operations.

    This class provides a context for managing database sessions and connections,
    including setup and cleanup of async database resources.

    Args:
        host (str): Database connection string
        engine_kwargs (Optional[dict[str, Any]]):
            Additional keyword arguments for the engine creation
    """

    def __init__(self, host: str, engine_kwargs: dict[str, Any] | None = None):
        engine_kwargs = engine_kwargs or {}

        self._engine = create_async_engine(host, **engine_kwargs)
        self._sessionmaker = async_sessionmaker(
            autocommit=False, expire_on_commit=False, bind=self._engine
        )

    async def close(self) -> None:
        """
        Closes the database engine and cleans up resources.

        Raises:
            Exception: If the DatabaseSessionManager is not initialized
        """
        if self._engine is None:
            raise Exception("DatabaseSessionManager is not initialized")
        await self._engine.dispose()

        self._engine = None  # type: ignore
        self._sessionmaker = None  # type: ignore

    @asynccontextmanager
    async def connect(self) -> AsyncIterator[AsyncConnection]:
        """
        Creates a database connection context.

        Creates and manages an async database connection with vector extension support.

        Yields:
            AsyncConnection: An async database connection

        Raises:
            Exception: If the DatabaseSessionManager is not initialized
        """
        if self._engine is None:
            raise Exception("DatabaseSessionManager is not initialized")

        async with self._engine.begin() as connection:
            try:
                # Enable the vector extension
                # https://github.com/pgvector/pgvector-python?tab=readme-ov-file#asyncpg
                await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                register_vector(connection)

                yield connection
            except Exception:
                await connection.rollback()
                raise

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """
        Creates a database session context.

        Provides a managed async session context with automatic cleanup
        and rollback on errors.

        Yields:
            AsyncSession: An async database session

        Raises:
            Exception: If the DatabaseSessionManager is not initialized
        """
        if self._sessionmaker is None:
            raise Exception("DatabaseSessionManager is not initialized")

        session = self._sessionmaker()
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


sessionmanager = DatabaseSessionManager(settings.get_database_url(), {"echo": True})


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """
    Creates a database session with version tracking enabled.

    Provides a dependency-injectable async database session factory with
    SQLAlchemy history tracking enabled.

    Yields:
        AsyncSession: An async database session with version tracking
    """
    async with sessionmanager.session() as session:
        versioned_session(session.sync_session)  # type: ignore
        yield session
