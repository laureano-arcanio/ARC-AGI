from app.models.example_table import ExampleTable
from app.repositories.example_table import ExampleTableRepository
from app.schemas.example_table import (
    ExampleTableCreate,
    ExampleTableRead,
    ExampleTableUpdate,
)
from app.services.base_service import BaseService


class ExampleTableService(
    BaseService[ExampleTable, ExampleTableCreate, ExampleTableUpdate, ExampleTableRead]
):
    repository: ExampleTableRepository
    read_schema = ExampleTableRead
