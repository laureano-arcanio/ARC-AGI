from app.types.base import BaseAPISchema

GridData = list[list[int]]


class ArcTaskPair(BaseAPISchema):
    input: GridData
    output: GridData


class ArcTaskRead(BaseAPISchema):
    id: str
    train: list[ArcTaskPair]
    test: list[ArcTaskPair]
