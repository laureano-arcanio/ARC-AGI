# Agent Guide — fastapi-next-starter

## Project Structure

```
/
├── backend/            # FastAPI (Python 3.12, Poetry, SQLAlchemy async, PostgreSQL/pgvector)
│   └── app/
│       ├── models/         # SQLAlchemy ORM models
│       ├── schemas/        # Pydantic API schemas (Create, Update, Read)
│       ├── repositories/   # DB queries (BaseRepository CRUD)
│       ├── services/       # Business logic + schema serialization (BaseService)
│       ├── routers/        # HTTP endpoints (thin layer, no logic)
│       ├── dependencies/   # FastAPI dependencies (DatabaseSession, auth)
│       ├── errors/         # Domain exceptions + HTTP handlers
│       ├── types/          # Base schema/type definitions
│       ├── docs/           # Architecture & implementation guides
│       └── alembic/        # Migrations
├── frontend/           # Vite + React (React 19, TypeScript, TanStack Query, Tailwind)
│   └── src/
│       ├── app/            # Router, providers, query client, layout
│       ├── components/     # UI primitives (ui/) & shared composed (common/)
│       ├── features/       # Feature-first vertical slices (api, queries, mutations, types, components, pages)
│       ├── lib/            # HTTP client, env config, utilities
│       ├── shared/         # Cross-feature hooks, types, utils, constants
│       └── assets/         # Static files
├── docker-compose.yml  # local dev: backend + frontend + postgres
└── AGENTS.md           # ← this file
```

## Documentation — Read Before Implementing

| Document | Location | When to Read |
|---|---|---|
| **Architecture (Backend)** | `backend/docs/ARCHITECTURE.md` | First time, or whenever unclear how layers interact |
| **Implementation Guide (Backend)** | `backend/docs/IMPLEMENTATION_GUIDE.md` | When adding a new endpoint or writing tests |
| **Architecture (Frontend)** | `frontend/docs/ARCHITECTURE.md` | First time, or whenever unclear about frontend layers |
| **Implementation Guide (Frontend)** | `frontend/docs/IMPLEMENTATION_GUIDE.md` | When adding a new feature or writing tests |

## Development Rules

- **Repository never imports schemas** — always returns raw ORM models (`ModelType`), never calls `model_validate`
- **Service always handles `model_validate`** — repository returns raw ORM, service converts to schema
- **Router never catches domain errors** — let the global exception handler convert them to HTTP
- **Domain exceptions and HTTP handlers live in separate files** — `errors/` keeps them apart
- **Every new entity must include a migration** — no schema drift
- **Every new endpoint must include all four test layers** — schemas, repos, services, routers
- **Test the 404 path for every `get_by_id`/`update`/`delete`** — it's the most commonly missed case
- **Use `conftest.py` for shared fixtures** — `MockAsyncSession`, sample model instances
- **Never commit, stash, or delete files without explicit user approval**
- **Run the full verification before committing**: `ruff check app/ tests/` + `mypy app/` + `pytest tests/`

> After implementing any feature, run `poetry run ruff check app/ tests/ && poetry run mypy app/ && poetry run pytest tests/` and ensure all three pass. Ruff and mypy errors block commits via pre-commit hooks, so fix them before staging.

## Frontend Development Rules

> After implementing any frontend feature, run `npm run lint && npm run build` (ESLint + tsc type check) and ensure both pass. These also run as pre-commit hooks, so fix issues before staging.

- **Form validation uses Zod schemas** — define once in `types.ts`, infer TypeScript types with `z.infer`
- **Components never call API functions or HTTP directly** — use query/mutation hooks instead
- **API functions never import React or React Query** — pure HTTP calls only via `lib/http.ts`
- **Query keys are co-located with the feature** — in `features/x/queries.ts`
- **Cache invalidation lives in mutation hooks** — not scattered across components
- **Shared code only after confirmed reuse** — don't prematurely extract to `shared/` or `components/common/`
- **Feature types live in `features/x/types.ts`** — prefer generated OpenAPI types for DTOs
- **UI primitives (`components/ui/`) have no business logic** — no API calls, no query keys
- **Routes are centralized in `app/router.tsx`** — pages live inside their feature folder

## Quick Commands

```bash
cd backend
poetry run pytest                           # run all tests
poetry run pytest tests/ -v -k "product"    # run tests matching "product"
poetry run ruff check app/ tests/           # lint
poetry run mypy app/                        # type check
poetry run alembic upgrade head             # apply migrations
poetry run uvicorn app.main:app --reload    # dev server

# Pre-commit hooks (ruff + mypy run before every commit)
poetry run pre-commit install               # enable hooks in this repo
poetry run pre-commit run --all-files       # run hooks manually
```

```bash
cd frontend
npm run dev                   # vite dev server on port 3000
npm run build                 # typecheck + vite build
npm run lint                  # eslint
```
