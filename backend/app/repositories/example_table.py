from app.models.example_table import ExampleTable
from app.repositories.base_repository import BaseRepository


class ExampleTableRepository(BaseRepository[ExampleTable]):
    model = ExampleTable
