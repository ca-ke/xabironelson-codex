import type { CommandHandler } from "../../adapters/cli/commands/handlers.js";
import type { CommandResult } from "../../core/entities/command.js";
import { createCommandResult } from "../../core/entities/command.js";
import type { LLMConfig } from "../../core/entities/config.js";
import type { Logger } from "../../infrastructure/logging/logger.js";
import type { WorkingDirectoryManager } from "../../infrastructure/patterns/working-directory-manager.js";
import type { LLMRepository } from "../ports/llm-repository.js";

export class CommandUseCase {
  constructor(
    private readonly registry: Record<string, CommandHandler>,
    private readonly llmConfig: LLMConfig,
    private readonly logger: Logger,
    private readonly workingDirectoryManager: WorkingDirectoryManager,
    private readonly llmRepository: LLMRepository,
  ) {}

  execute(command: string): CommandResult {
    const parts = command.trim().split(/\s+(.+)/);
    const commandName = parts[0] ?? "";
    const commandArguments = parts[1] ?? "";

    const handlerFunc = this.registry[commandName];

    if (!handlerFunc) {
      this.logger.warning("Unknown command.", {
        command: commandName,
        arguments: commandArguments,
        availableCommands: Object.keys(this.registry),
      });

      return createCommandResult(
        `Comando desconhecido: ${commandName}. Digite /help para ver os comandos disponíveis.`,
        false,
      );
    }

    try {
      const result = handlerFunc({
        commandArguments,
        llmConfig: this.llmConfig,
        logger: this.logger,
        workingDirectoryManager: this.workingDirectoryManager,
      });

      this.processAction(result);

      this.logger.info("Command executed successfully.", {
        command: commandName,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error("Error executing command.", {
        command: commandName,
        error: (error as Error).message,
      });

      return createCommandResult(
        `Erro ao executar o comando ${commandName}: ${(error as Error).message}`,
        false,
      );
    }
  }

  private processAction(result: CommandResult): void {
    if (!result.action) return;

    switch (result.action.type) {
      case "set_model":
        this.llmRepository.setModel(result.action.payload);
        break;
      default:
        this.logger.warning("Unknown command action.", {
          type: result.action.type,
        });
    }
  }
}
