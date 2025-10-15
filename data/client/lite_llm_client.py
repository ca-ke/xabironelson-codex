import os
from abc import ABC, abstractmethod
from typing import Dict, List

from litellm import completion
from litellm.exceptions import APIError, AuthenticationError, RateLimitError, Timeout

from data.dtos import CompletionResponseDTO
from domain.models.model_errors import (
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
)
from models.config import LLMConfig
from utils.logger import Logger


class LLMClient(ABC):
    """Abstract base class for LLM client."""

    @abstractmethod
    def complete(self, messages: List[Dict[str, str]]) -> CompletionResponseDTO:
        pass


class LiteLLMClient(LLMClient):
    def __init__(self, llm_config: LLMConfig, logger: Logger, prompt: str):
        self._llm_config = llm_config
        self._logger = logger
        self._prompt = prompt

    def complete(self, messages: list[dict]) -> CompletionResponseDTO:
        try:
            self._logger.info(
                "Calling LLM completion",
                context={
                    "model": self._llm_config.model,
                    "message_count": len(messages),
                    "prompt": self._prompt,
                },
            )

            response = completion(
                model=self._llm_config.model,
                prompt=self._prompt,
                messages=messages,
                max_tokens=self._llm_config.max_tokens,
                temperature=self._llm_config.temperature,
                api_key=os.getenv(self._llm_config.api_key_env),
            )

            content = response.choices[0].message.content
            tokens = response.usage.total_tokens
            finish_reason = response.choices[0].finish_reason

            self._logger.info(
                "LLM completion successful",
                context={"tokens_used": tokens, "finish_reason": finish_reason},
            )

            return CompletionResponseDTO(
                content=content,
                tokens_used=tokens,
                model=self._llm_config.model,
                finish_reason=finish_reason,
                raw_response=(
                    response.model_dump() if hasattr(response, "model_dump") else None
                ),
            )

        except AuthenticationError as e:
            self._logger.error("LLM authentication failed", context={"error": str(e)})
            raise LLMAuthenticationError(
                "Falha na autenticação com o serviço LLM. Verifique suas credenciais.",
                cause=e,
            )

        except RateLimitError as e:
            self._logger.error("LLM rate limit exceeded", context={"error": str(e)})
            raise LLMRateLimitError(
                "Limite de taxa excedido. Tente novamente mais tarde.", cause=e
            )

        except Timeout as e:
            self._logger.error("LLM request timed out", context={"error": str(e)})
            raise LLMTimeoutError(
                "A requisição excedeu o tempo limite.",
                cause=e,
            )

        except APIError as e:
            self._logger.error("LLM API error", context={"error": str(e)})
            raise LLMUnavailableError(
                "O serviço LLM está indisponível no momento.", cause=e
            )

        except Exception as e:
            self._logger.error(
                "Unexpected error during LLM completion",
                context={"error": str(e), "error_type": type(e).__name__},
            )
            raise LLMUnavailableError(
                f"Erro inesperado ao chamar o serviço LLM: {str(e)}", cause=e
            )
