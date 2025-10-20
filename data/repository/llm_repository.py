from data.client.lite_llm_client import LLMClient
from data.dtos import FunctionCallResponseDTO, TextResponseDTO
from data.mappers import ResponseMapper
from domain.boundary.llm_repository import LLMRepository
from domain.models.response_model import ResponseModel
from utils.logger import Logger


class LLMRepositoryImpl(LLMRepository):
    def __init__(
        self,
        llm_client: LLMClient,
        logger: Logger,
    ):
        self._llm_client = llm_client
        self._logger = logger
        self._short_term_memory: list[dict[str, str]] = []

    def complete(self, user_input: str) -> ResponseModel:
        self._short_term_memory.append({"role": "user", "content": user_input})

        self._logger.info(
            "Generating completion",
            context={"memory_size": len(self._short_term_memory)},
        )

        response_dto = self._llm_client.complete(
            messages=self._short_term_memory,
        )

        if isinstance(response_dto, TextResponseDTO):
            self._short_term_memory.append(
                {"role": "assistant", "content": response_dto.content}
            )
        elif isinstance(response_dto, FunctionCallResponseDTO):
            self._short_term_memory.append(
                {
                    "role": "assistant",
                    "content": f"Function call: {response_dto.function_name} with arguments {response_dto.function_arguments}",
                }
            )

        domain_response = ResponseMapper.to_domain(response_dto)

        self._logger.info(
            "Completion generated successfully",
            context={
                "tokens_used": domain_response.tokens_used,
                "memory_size": len(self._short_term_memory),
            },
        )

        return domain_response
