from abc import ABC, abstractmethod

from domain.models.response_model import ResponseModel


class LLMRepository(ABC):
    """Abstract base class for LLM repository."""

    @abstractmethod
    def complete(self, user_input: str) -> ResponseModel:
        """Generate a completion for the given prompt."""
        pass
