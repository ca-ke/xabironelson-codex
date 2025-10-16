from typing import Any, Callable, Optional

from domain.models.command_result import CommandResult
from models.config import LLMConfig
from utils.logger import Logger

CommandHandler = Callable[..., CommandResult]


def handle_exit(**kwargs: Any) -> CommandResult:
    """
    Handle the /exit command to terminate the Xabiro agent session.
    """
    return CommandResult(
        message="Até mais! Xabiro encerrado.",
        should_exit=True,
    )


def handle_help(**kwargs: Any) -> CommandResult:
    """
    Handle the /help command to provide a list of available commands.
    """
    help_message = (
        "Comandos disponíveis:\n"
        "/help - Mostrar esta mensagem de ajuda\n"
        "/exit - Sair do Xabiro\n"
        "/config - Mostra a Config atual do Xabiro\n"
    )
    return CommandResult(message=help_message, should_exit=False)


def handle_toggle_logging(**kwargs: Any) -> CommandResult:
    """
    Handle the /toggle_logging command to enable or disable logging.
    """
    logger: Optional[Logger] = kwargs.get("logger")

    if logger is None:
        raise ValueError(
            "Dependência 'logger' é obrigatória para o comando /toggle_logging."
        )

    logger.enabled = not logger.enabled
    status = "ativado" if logger.enabled else "desativado"
    return CommandResult(message=f"Logging {status}.", should_exit=False)


def handle_config(**kwargs: Any) -> CommandResult:
    """
    Handle the /config command to return the current status of the Xabiro agent.
    """
    llm_config: Optional[LLMConfig] = kwargs.get("llm_config")

    if llm_config is None:
        raise ValueError(
            "Dependência 'llm_config' é obrigatória para o comando /status."
        )

    status_msg = (
        f"Config atual do Xabiro:\n"
        f"  Modelo: {llm_config.model}\n"
        f"  Temperatura: {llm_config.temperature}\n"
        f"  Max Tokens: {llm_config.max_tokens}"
    )
    return CommandResult(message=status_msg, should_exit=False)
