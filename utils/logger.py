import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


class Logger(ABC):
    """Abstract base class for a logger."""

    @abstractmethod
    def error(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log an error message."""
        pass

    @abstractmethod
    def info(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log an info message."""
        pass

    @abstractmethod
    def warning(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log a warning message."""
        pass

    @abstractmethod
    def debug(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log a debug message."""
        pass


class BasicLogger(Logger):
    """A basic implementation of the Logger interface using Python's built-in logging module."""

    def error(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log an error message with optional context."""
        if context:
            logging.error(f"{message} | Context: {context}")
        else:
            logging.error(message)

    def info(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log an info message with optional context."""
        if context:
            logging.info(f"{message} | Context: {context}")
        else:
            logging.info(message)

    def warning(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log a warning message with optional context."""
        if context:
            logging.warning(f"{message} | Context: {context}")
        else:
            logging.warning(message)

    def debug(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log a debug message with optional context."""
        if context:
            logging.debug(f"{message} | Context: {context}")
        else:
            logging.debug(message)
