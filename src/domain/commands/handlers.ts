/**
 * Command handlers for the CLI commands.
 */

import * as path from 'path';
import type { CommandResult } from '../models/command.js';
import { createCommandResult } from '../models/command.js';
import type { Logger } from '../../utils/logger.js';
import type { LLMConfig } from '../models/config.js';
import type { WorkingDirectoryManager } from '../pattern/working-directory-manager.js';

export type CommandHandler = (args: CommandHandlerArgs) => CommandResult;

export interface CommandHandlerArgs {
  commandArguments?: string;
  logger?: Logger;
  llmConfig?: LLMConfig;
  workingDirectoryManager?: WorkingDirectoryManager;
}

/**
 * Handle the /cd command to change the working directory.
 */
export function handleChangeWorkingDirectory(args: CommandHandlerArgs): CommandResult {
  const { commandArguments, workingDirectoryManager } = args;

  if (!workingDirectoryManager) {
    throw new Error("Dependency 'workingDirectoryManager' is required for the /cd command.");
  }

  if (!commandArguments) {
    return createCommandResult(
      "Erro: O argumento 'new_directory' é obrigatório para o comando /cd.",
      false
    );
  }

  try {
    const absDirectory = path.resolve(commandArguments);
    workingDirectoryManager.setDirectory(absDirectory);
    return createCommandResult(
      `Diretório de trabalho alterado para: ${absDirectory}`,
      false
    );
  } catch (error) {
    return createCommandResult((error as Error).message, false);
  }
}

/**
 * Handle the /exit command to terminate the session.
 */
export function handleExit(_args: CommandHandlerArgs): CommandResult {
  return createCommandResult("Até mais! Xabiro encerrado.", true);
}

/**
 * Handle the /help command to provide available commands.
 */
export function handleHelp(_args: CommandHandlerArgs): CommandResult {
  const helpMessage = `Comandos disponíveis:
/help - Mostrar esta mensagem de ajuda
/exit - Sair do Xabiro
/config - Mostra a Config atual do Xabiro
/toggle_logging - Ativar/Desativar logging
/cd <diretório> - Alterar o diretório de trabalho do Xabiro`;

  return createCommandResult(helpMessage, false);
}

/**
 * Handle the /toggle_logging command to enable or disable logging.
 */
export function handleToggleLogging(args: CommandHandlerArgs): CommandResult {
  const { logger } = args;

  if (!logger) {
    throw new Error("Dependency 'logger' is required for the /toggle_logging command.");
  }

  logger.enabled = !logger.enabled;
  const status = logger.enabled ? "ativado" : "desativado";
  return createCommandResult(`Logging ${status}.`, false);
}

/**
 * Handle the /config command to return the current configuration.
 */
export function handleConfig(args: CommandHandlerArgs): CommandResult {
  const { llmConfig } = args;

  if (!llmConfig) {
    throw new Error("Dependency 'llmConfig' is required for the /config command.");
  }

  const statusMsg = `Config atual do Xabiro:
  Modelo: ${llmConfig.model}
  Temperatura: ${llmConfig.temperature}
  Max Tokens: ${llmConfig.max_tokens}`;

  return createCommandResult(statusMsg, false);
}
