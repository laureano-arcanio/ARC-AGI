## FastAPI Backend Architecture

---

### Layers & Responsibilities

**Models** — Represent database tables only. No logic, no validation. Defined with SQLAlchemy 2.0 `Mapped` annotations. Each model extends `AbstractBase` which provides `id`, `created_at`, `updated_at`.

**Schemas** — Pydantic models that define API contracts. Three per entity: `Create`, `Update`, `Read`. Never imported by repositories. All extend `BaseAPISchema` (camelCase aliasing, `from_attributes=True`).

**Repositories** — All database access lives here, nowhere else. Return raw ORM model instances, never schemas. A generic `BaseRepository[ModelType]` provides reusable CRUD. Each entity extends it with specific queries like filters, joins, and search.

**Services** — Business logic and orchestration. Calls repositories, handles schema serialization (`model_validate`). Enforces rules, raises domain errors. Never touches HTTP or FastAPI concepts.

**Routers** — Thin HTTP layer. Translates requests into service calls and maps domain errors to HTTP status codes via exception handlers. No logic here.

---

### Data Flow

```
Request → Router → Service → Repository → DB
                 ↑ Schemas       ↑ Models
                 (model_validate) (raw ORM)
```

---

### Dependency Injection

```
DB session → Repository → Service → Router
```

Nothing is instantiated manually inside route handlers. FastAPI's `Depends` system handles the wiring. Each router defines a `get_service` dependency that constructs the repository with the DB session and passes it to the service.

---

### Key Rules

| Layer | Owns | Never touches |
|---|---|---|
| Router | HTTP in/out | DB, models, business rules |
| Service | Business logic, schema serialization | HTTP, FastAPI, raw SQL |
| Repository | DB queries, raw ORM returns | Schemas, HTTP, business rules |
| Model | Table shape | Everything else |

---

### File Layout per Entity (Example: `ExampleTable`)

```
models/example_table.py           → ExampleTable model
schemas/example_table.py          → ExampleTableCreate, Update, Read
repositories/example_table.py     → ExampleTableRepository extends BaseRepository[ExampleTable]
services/example_table.py         → ExampleTableService extends BaseService[...]
routers/example_table.py          → CRUD endpoints at /api/v1/example-tables
alembic/versions/                 → migration for the table
tests/test_schemas.py             → schema validation tests
tests/test_repositories.py        → repo tests with MockAsyncSession
tests/test_services.py            → service tests with AsyncMock repo
tests/test_routers.py             → endpoint tests with TestClient + dependency override
```

### Testing Strategy

- **Mock at the boundary of each layer**: session for repos, repo for services, service dependency for routers.
- **Schemas**: pure Pydantic — no mocking needed.
- **Repositories**: mock `AsyncSession.execute()` via `MockAsyncSession` helper.
- **Services**: mock repository with `AsyncMock`. Verify schema conversion (`model_validate`) and domain error passthrough.
- **Routers**: use `TestClient` with `ASGITransport`. Override the `get_service` dependency. Register exception handlers on the test app.

---

### Exception Handling

Domain errors (`ObjectNotFoundError`) are raised in repositories/services and caught by global exception handlers registered in `main.py`. Handlers are separated from domain exceptions — `errors/object_not_found_error.py` contains only the exception class, `errors/handlers.py` contains the FastAPI-specific handler.
