from domain.commands.handlers import CommandHandler
from models.config import LLMConfig
from utils.logger import Logger


class CommandUseCase:
    def __init__(
        self,
        command_registry: dict[str, CommandHandler],
        # TODO: Isso daqui vai dar dor de cabeça com o comando de troca de modelo
        llm_config: LLMConfig,
        logger: Logger,
    ):
        self._registry = command_registry
        self._llm_config = llm_config
        self._logger = logger

        self._available_deps = {
            "llm_config": self._llm_config,
            "logger": self._logger,
        }

    def execute(self, command: str) -> CommandHandler:
        """
        Execute the command if it exists in the registry.
        """
        parts = command.strip().split(maxsplit=1)
        # TODO: Por agora o comando não tem argumento :)
        command_name = parts[0]

        handler_func = self._registry.get(command_name)
        if handler_func is None:
            self._logger.warning(
                "Comando desconhecido.",
                context={
                    "command": command_name,
                    "available_commands": list(self._registry.keys()),
                },
            )
            return CommandHandler(
                message=f"Comando desconhecido: {command_name}. Digite /help para ver os comandos disponíveis.",
                should_exit=False,
            )

        try:
            result = handler_func(**self._available_deps)
            self._logger.info(
                "Comando executado com sucesso.",
                context={"command": command_name, "result": result},
            )
            return result
        except Exception as e:
            self._logger.error(
                "Erro ao executar o comando.",
                context={"command": command_name, "error": str(e)},
            )
            return CommandHandler(
                message=f"Erro ao executar o comando {command_name}: {str(e)}",
                should_exit=False,
            )
