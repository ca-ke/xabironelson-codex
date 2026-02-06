import type { CommandHandler } from "./handlers.js";
import {
  handleChangeWorkingDirectory,
  handleConfig,
  handleExit,
  handleHelp,
  handleModel,
  handleToggleLogging,
} from "./handlers.js";

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  "/exit": handleExit,
  "/config": handleConfig,
  "/help": handleHelp,
  "/model": handleModel,
  "/toggle_logging": handleToggleLogging,
  "/cd": handleChangeWorkingDirectory,
};
