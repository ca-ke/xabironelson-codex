import json
import os
from abc import ABC, abstractmethod
from typing import Dict, List

from litellm import completion
from litellm.exceptions import APIError, AuthenticationError, RateLimitError, Timeout

from data.dtos import FunctionCallResponseDTO, ResponseDTO, TextResponseDTO
from domain.models.model_errors import (
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMUnavailableError,
)
from models.config import LLMConfig
from models.tool_model import ToolModel
from utils.logger import Logger


class LLMClient(ABC):
    """Abstract base class for LLM client."""

    @abstractmethod
    def complete(self, messages: List[Dict[str, str]]) -> ResponseDTO:
        pass


class LiteLLMClient(LLMClient):
    def __init__(
        self,
        llm_config: LLMConfig,
        logger: Logger,
        prompt: str,
        tools: list[ToolModel],
    ):
        self._llm_config = llm_config
        self._logger = logger
        self._prompt = prompt
        self._tools = list(map(lambda tool: tool.model_dump(), tools))

    def complete(self, messages: list[dict]) -> ResponseDTO:
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
                tools=self._tools,
                max_tokens=self._llm_config.max_tokens,
                temperature=self._llm_config.temperature,
                api_key=os.getenv(self._llm_config.api_key_env),
            )

            self._logger.info(
                "LLM response received", context={"response": response.model_dump()}
            )

            if not response.choices:
                self._logger.error(
                    "LLM completion returned no choices",
                    context={
                        "response": response.model_dump()
                        if hasattr(response, "model_dump")
                        else None
                    },
                )
                raise LLMUnavailableError("O serviço LLM retornou nenhuma resposta.")

            if response.choices[0].finish_reason == "tool_calls":
                self._logger.info(
                    "LLM made a tool call",
                    context={"tool_call": response.choices[0].message.tool_calls},
                )
                return FunctionCallResponseDTO(
                    function_name=response.choices[0]
                    .message.tool_calls[0]
                    .function.name,
                    function_arguments=json.loads(
                        response.choices[0].message.tool_calls[0].function.arguments
                    ),
                    tokens_used=response.usage.total_tokens,
                    model=self._llm_config.model,
                    finish_reason=response.choices[0].finish_reason,
                    raw_response=(
                        response.model_dump()
                        if hasattr(response, "model_dump")
                        else None
                    ),
                )

            content = response.choices[0].message.content
            tokens = response.usage.total_tokens
            finish_reason = response.choices[0].finish_reason

            self._logger.info(
                "LLM completion successful",
                context={"tokens_used": tokens, "finish_reason": finish_reason},
            )

            return TextResponseDTO(
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
