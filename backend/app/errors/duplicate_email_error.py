class DuplicateEmailError(Exception):
    def __init__(self, email: str) -> None:
        self.email = email
        self.message = f"A user with this email already exists: {email}"
