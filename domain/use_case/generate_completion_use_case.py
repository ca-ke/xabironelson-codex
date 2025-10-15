from domain.boundary.llm_repository import LLMRepository
from domain.models.model_errors import LLMUnavailableError
from utils.logger import Logger


class GenerateCompletionUseCase:
    def __init__(self, repository: LLMRepository, logger: Logger):
        self._repository = repository
        self._logger = logger

    def execute(self, user_input: str):
        self._logger.info("Processing user input.", context={"length": len(user_input)})
        # TODO: Podemos aplicar nossas GuardRails aqui. Logo faremos isso.
        try:
            completion = self._repository.complete(user_input)
            self._logger.info(
                "Completion generation successful.",
                context={"completion_length": len(completion.content)},
            )
            return completion
        except LLMUnavailableError as e:
            self._logger.error("LLM service unavailable.", context={"error": str(e)})
            raise e
