from abc import ABC, abstractmethod


class Tool(ABC):
    """Abstract base class for tools."""

    @abstractmethod
    def execute(self, **kwargs) -> str:
        """Execute the tool with the given input data."""
        pass
