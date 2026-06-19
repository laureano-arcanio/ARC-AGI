from abc import ABC

from pydantic import BaseModel, ConfigDict

from app.utils.string import snake_to_camel


class BaseAPISchema(BaseModel, ABC):
    """Abstract base API schema for all Pydantic API/database
    models in the application."""

    model_config = ConfigDict(
        alias_generator=snake_to_camel,
        populate_by_name=True,
        from_attributes=True,
        use_attribute_docstrings=True,
    )
