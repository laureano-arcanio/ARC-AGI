class InvalidCredentialsError(Exception):
    def __init__(self) -> None:
        self.message = "Invalid email or password"
