/**
 * Use case for executing CLI commands.
 */

import type { CommandHandler } from '../commands/handlers.js';
import type { CommandResult } from '../models/command.js';
import { createCommandResult } from '../models/command.js';
import type { Logger } from '../../utils/logger.js';
import type { LLMConfig } from '../models/config.js';
import type { WorkingDirectoryManager } from '../pattern/working-directory-manager.js';

export class CommandUseCase {
  constructor(
    private readonly registry: Record<string, CommandHandler>,
    private readonly llmConfig: LLMConfig,
    private readonly logger: Logger,
    private readonly workingDirectoryManager: WorkingDirectoryManager
  ) {}

  execute(command: string): CommandResult {
    const parts = command.trim().split(/\s+(.+)/);
    const commandName = parts[0] ?? '';
    const commandArguments = parts[1] ?? '';

    const handlerFunc = this.registry[commandName];

    if (!handlerFunc) {
      this.logger.warning('Unknown command.', {
        command: commandName,
        arguments: commandArguments,
        availableCommands: Object.keys(this.registry),
      });

      return createCommandResult(
        `Comando desconhecido: ${commandName}. Digite /help para ver os comandos disponíveis.`,
        false
      );
    }

    try {
      const result = handlerFunc({
        commandArguments,
        llmConfig: this.llmConfig,
        logger: this.logger,
        workingDirectoryManager: this.workingDirectoryManager,
      });

      this.logger.info('Command executed successfully.', {
        command: commandName,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error('Error executing command.', {
        command: commandName,
        error: (error as Error).message,
      });

      return createCommandResult(
        `Erro ao executar o comando ${commandName}: ${(error as Error).message}`,
        false
      );
    }
  }
}
