import {
  createCommandResult,
  type CommandResult,
} from "@/core/entities/command";
import * as path from "path";
import type { LLMConfig } from "../../../core/entities/config";
import type { Logger } from "../../../infrastructure/logging/logger";
import { loggingEventBus } from "../../../infrastructure/patterns/logging-event-bus";
import type { WorkingDirectoryManager } from "../../../infrastructure/patterns/working-directory-manager";

export type CommandHandler = (args: CommandHandlerArgs) => CommandResult;

export interface CommandHandlerArgs {
  commandArguments?: string;
  logger?: Logger;
  llmConfig?: LLMConfig;
  workingDirectoryManager?: WorkingDirectoryManager;
}

export function handleChangeWorkingDirectory(
  args: CommandHandlerArgs,
): CommandResult {
  const { commandArguments, workingDirectoryManager } = args;

  if (!workingDirectoryManager) {
    throw new Error(
      "Dependency 'workingDirectoryManager' is required for the /cd command.",
    );
  }

  if (!commandArguments) {
    return createCommandResult(
      "Erro: O argumento 'new_directory' é obrigatório para o comando /cd.",
      false,
    );
  }

  try {
    const absDirectory = path.resolve(commandArguments);
    workingDirectoryManager.setDirectory(absDirectory);
    return createCommandResult(
      `Diretório de trabalho alterado para: ${absDirectory}`,
      false,
    );
  } catch (error) {
    return createCommandResult((error as Error).message, false);
  }
}

export function handleExit(_args: CommandHandlerArgs): CommandResult {
  return createCommandResult("Até mais! Xabiro encerrado.", true);
}

export function handleHelp(_args: CommandHandlerArgs): CommandResult {
  const helpMessage = `Comandos disponíveis:
/help - Mostrar esta mensagem de ajuda
/exit - Sair do Xabiro
/config - Mostra a Config atual do Xabiro
/model <modelo> - Alterar o modelo de LLM
/toggle_logging - Ativar/Desativar logging
/cd <diretório> - Alterar o diretório de trabalho do Xabiro`;

  return createCommandResult(helpMessage, false);
}

export function handleToggleLogging(args: CommandHandlerArgs): CommandResult {
  const { logger } = args;

  if (!logger) {
    throw new Error(
      "Dependency 'logger' is required for the /toggle_logging command.",
    );
  }

  loggingEventBus.emitToggle();

  return createCommandResult("", false);
}

export function handleModel(args: CommandHandlerArgs): CommandResult {
  const { commandArguments } = args;

  if (!commandArguments) {
    return createCommandResult("Usage: /model <model_name>", false);
  }

  const modelName = commandArguments.trim();
  return createCommandResult(`Model changed to: ${modelName}`, false, {
    type: "set_model",
    payload: modelName,
  });
}

export function handleConfig(args: CommandHandlerArgs): CommandResult {
  const { llmConfig } = args;

  if (!llmConfig) {
    throw new Error(
      "Dependency 'llmConfig' is required for the /config command.",
    );
  }

  const statusMsg = `Config atual do Xabiro:
  Modelo: ${llmConfig.model}
  Temperatura: ${llmConfig.temperature}
  Max Tokens: ${llmConfig.max_tokens}`;

  return createCommandResult(statusMsg, false);
}
