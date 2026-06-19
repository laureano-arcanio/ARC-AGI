# FastAPI + Next.js Starter

Full-stack starter with FastAPI backend + Next.js frontend, PostgreSQL (pgvector), and Docker Compose for local development.

---

## Quick Start (Docker)

```bash
docker compose --profile local up -d
```

- **Backend API**: http://localhost:8000 — auto-reloads on code changes
- **API docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **PostgreSQL**: localhost:5432

---

## Manual Setup

### Prerequisites

- Python 3.12+, Poetry
- Node.js 20+, pnpm
- PostgreSQL 15+ with pgvector extension (or `docker compose up -d postgres`)

### Backend

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL if needed
poetry install
poetry run pre-commit install # enables ruff + mypy on every commit
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (required) | `postgresql+asyncpg://user:pass@host:5432/db` |
| `ENVIRONMENT` | `local` | `local`, `dev`, or `prod` |
| `API_V1_STR` | `/api/v1` | API prefix |

---

## Common Commands

| Action | Command |
|---|---|
| Run backend tests | `cd backend && poetry run pytest` |
| Run lint | `cd backend && poetry run ruff check app/ tests/` |
| Type check | `cd backend && poetry run mypy app/` |
| Create migration | `cd backend && poetry run alembic revision --autogenerate -m "description"` |
| Apply migrations | `cd backend && poetry run alembic upgrade head` |

---

## Architecture

See `backend/app/docs/ARCHITECTURE.md` for layer responsibilities, data flow, and file layout.

For step-by-step instructions on implementing new API endpoints with tests, see `AGENTS.md` at the project root.
