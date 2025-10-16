from domain.commands.handlers import (
    CommandHandler,
    handle_config,
    handle_exit,
    handle_help,
    handle_toggle_logging,
)

COMMAND_REGISTRY: dict[str, CommandHandler] = {
    "/exit": handle_exit,
    "/config": handle_config,
    "/help": handle_help,
    "/toggle_logging": handle_toggle_logging, 
}
