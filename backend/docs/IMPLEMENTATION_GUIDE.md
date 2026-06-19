# Backend API — Implementation Guide

## Per-Entity File Layout

```
models/<entity>.py           → SQLAlchemy ORM model
schemas/<entity>.py          → Pydantic schemas (Create, Update, Read)
repositories/<entity>.py     → DB queries, extends BaseRepository
services/<entity>.py         → Business logic + schema serialization, extends BaseService
routers/<entity>.py          → HTTP endpoints
alembic/versions/            → database migration
tests/test_schemas.py        → schema validation tests
tests/test_repositories.py   → repo tests with MockAsyncSession
tests/test_services.py       → service tests with AsyncMock repo
tests/test_routers.py        → endpoint tests with TestClient + dependency override
```

---

## How to Add a New Entity (e.g. `Product`)

### 1. Model (`models/product.py`)

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.models import AbstractBase


class Product(AbstractBase):
    __tablename__ = "product"

    name: Mapped[str] = mapped_column(nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)
```

Register in `models/__init__.py`:
```python
from app.models.product import Product  # noqa: E402, F401
```

### 2. Schemas (`schemas/product.py`)

Three schemas per entity — Create, Update (all fields optional), Read:

```python
from datetime import datetime

from app.types.base import BaseAPISchema


class ProductCreate(BaseAPISchema):
    name: str
    price: float


class ProductUpdate(BaseAPISchema):
    name: str | None = None
    price: float | None = None


class ProductRead(BaseAPISchema):
    id: int
    name: str
    price: float
    created_at: datetime | None = None
    updated_at: datetime | None = None
```

### 3. Repository (`repositories/product.py`)

Extend `BaseRepository[ModelType]`, set `model`. Custom queries go here:

```python
from app.models.product import Product
from app.repositories.base_repository import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product
```

### 4. Service (`services/product.py`)

Extend `BaseService`, set `repository` type hint and `read_schema`:

```python
from app.models.product import Product
from app.repositories.product import ProductRepository
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services.base_service import BaseService


class ProductService(
    BaseService[Product, ProductCreate, ProductUpdate, ProductRead]
):
    repository: ProductRepository
    read_schema = ProductRead
```

Add custom business logic methods here. Service handles `model_validate()` — repository never touches schemas.

### 5. Router (`routers/product.py`)

```python
from fastapi import APIRouter, Depends, status

from app.dependencies.database import DatabaseSession
from app.repositories.product import ProductRepository
from app.schemas.product import (
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
from app.services.product import ProductService


router = APIRouter(prefix="/api/v1/products", tags=["products"])


async def get_service(db_session: DatabaseSession) -> ProductService:
    repository = ProductRepository(db_session=db_session)
    return ProductService(repository=repository)


@router.get("/", response_model=list[ProductRead])
async def get_all(
    service: ProductService = Depends(get_service),  # noqa: B008
) -> list[ProductRead]:
    return await service.get_all()


@router.get("/{id}", response_model=ProductRead)
async def get_by_id(
    id: int,
    service: ProductService = Depends(get_service),  # noqa: B008
) -> ProductRead:
    return await service.get_by_id(id)


@router.post(
    "/", response_model=ProductRead, status_code=status.HTTP_201_CREATED
)
async def create(
    data: ProductCreate,
    service: ProductService = Depends(get_service),  # noqa: B008
) -> ProductRead:
    return await service.create(data)


@router.put("/{id}", response_model=ProductRead)
async def update(
    id: int,
    data: ProductUpdate,
    service: ProductService = Depends(get_service),  # noqa: B008
) -> ProductRead:
    return await service.update(id, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    id: int,
    service: ProductService = Depends(get_service),  # noqa: B008
) -> None:
    await service.delete(id)
```

Register in `main.py`:
```python
from app.routers import product

app.include_router(product.router)
```

### 6. Migration

Generate via Alembic (requires a running DB):

```bash
DATABASE_URL=... poetry run alembic revision --autogenerate -m "create product"
```

---

## Hard Requirement: Unit Tests

Every new endpoint **must** have tests at each layer. Write them before or alongside the implementation.

All tests go in `backend/tests/`. Run with: `poetry run pytest`

### 1. Schema Tests (`tests/test_schemas.py`)

Pure Pydantic — no mocking needed. Test validation, optional fields, and `model_dump`:

```python
class TestProductCreate:
    def test_valid(self):
        data = ProductCreate(name="x", price=1.0)
        assert data.name == "x"

    def test_missing_required_raises(self):
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            ProductCreate()
```

### 2. Repository Tests (`tests/test_repositories.py`)

Mock `AsyncSession` using `MockAsyncSession` from `conftest.py`. Test every CRUD path:

```python
class TestProductRepositoryCreate:
    async def test_creates_instance(self, db_session):
        repo = ProductRepository(db_session=db_session)
        result = await repo.create({"name": "x", "price": 1.0})
        assert result.name == "x"
        assert len(db_session.added) == 1
        assert db_session.flushed is True
```

**What to test per method:**
- `get_all` — empty list, multiple results
- `get_by_id` — found (verify returned model), not found (`ObjectNotFoundError`)
- `create` — with all fields, with only required fields, verify `db_session.added` and `db_session.flushed`
- `update` — partial update (exclude_unset behavior), not found
- `delete` — success, not found

### 3. Service Tests (`tests/test_services.py`)

Mock the repository with `AsyncMock`. Test that methods delegate correctly and return schemas:

```python
class TestProductServiceCreate:
    async def test_returns_schema(self):
        repo = AsyncMock()
        repo.create.side_effect = lambda d: Product(id=1, **d)
        svc = ProductService(repository=repo)
        svc.read_schema = ProductRead
        result = await svc.create(ProductCreate(name="x", price=1.0))
        assert isinstance(result, ProductRead)
        assert result.name == "x"
        repo.create.assert_awaited_with({"name": "x", "price": 1.0})
```

**What to test per method:**
- `get_all` — empty, list of schemas
- `get_by_id` — success (clear side_effect first), not found
- `create` — delegation with correct dict, schema return type
- `update` — delegation with `exclude_unset`, not found
- `delete` — delegation, not found

### 4. Router Tests (`tests/test_routers.py`)

Use `TestClient` with `ASGITransport`. Override the `get_service` dependency. Register exception handlers:

```python
@pytest.fixture
def app(mock_service):
    application = FastAPI()
    application.exception_handler(ObjectNotFoundError)(object_not_found_handler)
    application.exception_handler(Exception)(global_exception_handler)
    application.include_router(router)
    application.dependency_overrides[get_service] = lambda: mock_service
    return application


@pytest.fixture
def mock_service():
    svc = AsyncMock(spec=ProductService)
    svc.get_all.return_value = []
    svc.get_by_id.side_effect = ObjectNotFoundError("Product", 0)
    svc.create.return_value = ProductRead(id=1, name="x", price=1.0)
    svc.update.side_effect = ObjectNotFoundError("Product", 0)
    svc.delete.side_effect = ObjectNotFoundError("Product", 0)
    return svc
```

**What to test per endpoint:**
- `GET /` — empty list, list with items
- `GET /{id}` — found (clear side_effect + set return_value), 404 (default side_effect)
- `POST /` — 201 created (verify `await_args`), 422 for missing required field
- `PUT /{id}` — 200 (clear side_effect + set return_value), 404
- `DELETE /{id}` — 204 (clear side_effect), 404

---

## Common Testing Patterns

### Mock for `get_by_id` returning a value (override default side_effect)

```python
mock_service.get_by_id.side_effect = None
mock_service.get_by_id.return_value = ProductRead(id=1, name="x", price=1.0)
```

### Mock for `create` — verify the schema that was passed

```python
response = await client.post("/api/v1/products/", json={"name": "x", "price": 1.0})
args = mock_service.create.await_args[0][0]
assert isinstance(args, ProductCreate)
assert args.name == "x"
```
