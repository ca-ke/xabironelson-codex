/**
 * Use case for executing tools.
 */

import type { Tool } from '../boundary/tool.js';
import type { Logger } from '../../utils/logger.js';

export class ExecuteToolUseCase {
  constructor(
    private readonly tools: Record<string, Tool>,
    private readonly logger: Logger,
    private readonly workingDirectory: string
  ) {}

  async execute(toolName: string, args: Record<string, unknown>): Promise<string> {
    this.logger.info('Executing tool.', {
      toolName,
      arguments: args,
    });

    try {
      const tool = this.tools[toolName];
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found.`);
      }

      const argumentsCopy = { ...args };
      argumentsCopy.working_directory = this.workingDirectory;

      const result = await tool.execute(argumentsCopy);

      this.logger.info('Tool executed successfully.', {
        toolName,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error('Tool execution failed.', {
        toolName,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
