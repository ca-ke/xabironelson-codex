from typing import Optional

from data.dtos import CompletionResponseDTO
from domain.models.response_model import ResponseModel


class ResponseMapper:
    @staticmethod
    def to_domain(dto: CompletionResponseDTO) -> ResponseModel:
        return ResponseModel(
            content=dto.content,
            tokens_used=dto.tokens_used,
        )

    @staticmethod
    def to_dto(
        domain_model: ResponseModel,
        model: str,
        finish_reason: Optional[str] = None,
    ) -> CompletionResponseDTO:
        return CompletionResponseDTO(
            content=domain_model.content,
            tokens_used=domain_model.tokens_used,
            model=model,
            finish_reason=finish_reason,
        )
