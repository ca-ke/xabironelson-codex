from typing import Any, Optional

from pydantic import BaseModel, Field


class MessageDTO(BaseModel):
    role: str = Field(
        ..., description="The role of the message sender (user/assistant/system)"
    )
    content: str = Field(..., description="The content of the message")


class CompletionResponseDTO(BaseModel):
    content: str = Field(..., description="The generated content")
    tokens_used: int = Field(..., description="Number of tokens used in the completion")
    model: str = Field(..., description="The model used for completion")
    finish_reason: Optional[str] = Field(
        None, description="Reason why the completion finished"
    )
    raw_response: Optional[dict[str, Any]] = Field(
        None, description="Raw response from the LLM API"
    )
