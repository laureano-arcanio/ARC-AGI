class ObjectNotFoundError(Exception):
    def __init__(self, object_type: str, object_id: int | str):
        self.object_type = object_type
        self.object_id = object_id
        self.message = f"{object_type} with id {object_id} not found"
