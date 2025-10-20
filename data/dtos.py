from typing import Any

from pydantic import BaseModel, Field


class MessageDTO(BaseModel):
    role: str = Field(
        ..., description="The role of the message sender (user/assistant/system)"
    )
    content: str = Field(..., description="The content of the message")


class ResponseDTO(BaseModel):
    tokens_used: int = Field(
        ...,
        description="Number of tokens used in the response",
    )
    model: str = Field(
        ...,
        description="The model used for generating the response",
    )
    finish_reason: str | None = Field(
        None,
        description="Reason why the response generation finished",
    )
    raw_response: dict[str, Any] | None = Field(
        None,
        description="Raw response from the LLM API",
    )

    def get_response_type(self) -> str:
        return "base"


class TextResponseDTO(ResponseDTO):
    content: str = Field(..., description="The generated text content")

    def get_response_type(self) -> str:
        return "text"


class FunctionCallResponseDTO(ResponseDTO):
    function_name: str = Field(
        ...,
        description="The name of the function to be called",
    )
    function_arguments: dict[str, Any] = Field(
        ...,
        description="Arguments for the function call",
    )

    def get_response_type(self) -> str:
        return "function_call"
