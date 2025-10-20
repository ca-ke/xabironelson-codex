from typing import Any

from pydantic import BaseModel, Field


class ResponseModel(BaseModel):
    tokens_used: int = Field(
        ...,
        description="Number of tokens used in the response",
    )
    model: str = Field(
        ...,
        description="The model used for generating the response",
    )
    raw_response: dict[str, Any] | None = Field(
        None,
        description="Raw response from the LLM API",
    )
    finish_reason: str | None = Field(
        None,
        description="Reason why the response generation finished",
    )


class TextResponseModel(ResponseModel):
    content: str = Field(
        ...,
        description="The generated text content",
    )


class FunctionCallResponseModel(ResponseModel):
    function_name: str = Field(
        ...,
        description="The name of the function to be called",
    )
    function_arguments: dict[str, Any] = Field(
        ...,
        description="Arguments for the function call",
    )
