from domain.boundary.llm_repository import LLMRepository
from domain.models.model_errors import LLMUnavailableError
from domain.models.response_model import FunctionCallResponseModel, ResponseModel
from utils.logger import Logger


class GenerateCompletionUseCase:
    def __init__(self, repository: LLMRepository, logger: Logger):
        self._repository = repository
        self._logger = logger

    def execute(self, user_input: str) -> ResponseModel:
        self._logger.info("Processing user input.", context={"length": len(user_input)})
        # TODO: Podemos aplicar nossas GuardRails aqui. Logo faremos isso.
        try:
            completion = self._repository.complete(user_input)
            self._logger.info(
                "Completion generation successful.",
                context={
                    "is_function_call": {
                        isinstance(completion, FunctionCallResponseModel)
                    }
                },
            )
            return completion
        except LLMUnavailableError as e:
            self._logger.error("LLM service unavailable.", context={"error": str(e)})
            raise e
