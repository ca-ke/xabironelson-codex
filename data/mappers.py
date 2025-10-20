from data.dtos import ResponseDTO
from domain.models.response_model import (
    FunctionCallResponseModel,
    ResponseModel,
    TextResponseModel,
)


class ResponseMapper:
    @staticmethod
    def to_domain(dto: ResponseDTO) -> ResponseModel:
        if dto.get_response_type() == "text":
            return TextResponseModel(
                content=dto.content,
                tokens_used=dto.tokens_used,
                model=dto.model,
                raw_response=dto.raw_response,
                finish_reason=dto.finish_reason,
            )
        elif dto.get_response_type() == "function_call":
            return FunctionCallResponseModel(
                function_name=dto.function_name,
                function_arguments=dto.function_arguments,
                tokens_used=dto.tokens_used,
                model=dto.model,
                raw_response=dto.raw_response,
                finish_reason=dto.finish_reason,
            )
        else:
            raise ValueError(
                f"Unknown DTO response type: {dto.get_response_type()}",
            )
