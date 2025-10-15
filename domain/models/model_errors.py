"""Domain exceptions for the LLM system."""


class DomainError(Exception):
    """Base class for all domain exceptions."""

    def __init__(self, message: str, cause: Exception = None):
        self.message = message
        self.cause = cause
        super().__init__(self.message)


class LLMError(DomainError):
    """Base class for LLM-related errors."""

    pass


class LLMUnavailableError(LLMError):
    """Exception raised when the LLM service is unavailable."""

    def __init__(
        self, message: str = "LLM service is unavailable", cause: Exception = None
    ):
        super().__init__(message, cause)


class LLMAuthenticationError(LLMError):
    """Exception raised when LLM authentication fails."""

    def __init__(
        self, message: str = "LLM authentication failed", cause: Exception = None
    ):
        super().__init__(message, cause)


class LLMRateLimitError(LLMError):
    """Exception raised when LLM rate limit is exceeded."""

    def __init__(
        self, message: str = "LLM rate limit exceeded", cause: Exception = None
    ):
        super().__init__(message, cause)


class LLMTimeoutError(LLMError):
    """Exception raised when LLM request times out."""

    def __init__(self, message: str = "LLM request timed out", cause: Exception = None):
        super().__init__(message, cause)


class ValidationError(DomainError):
    """Exception raised when input validation fails."""

    def __init__(
        self, message: str = "Input validation failed", cause: Exception = None
    ):
        super().__init__(message, cause)
