/**
 * Use case for generating LLM completions.
 */

import type { LLMRepository } from '../boundary/llm-repository.js';
import type { ResponseModel } from '../models/response.js';
import { LLMUnavailableError } from '../models/errors.js';
import type { Logger } from '../../utils/logger.js';
import { isFunctionCallResponse } from '../models/response.js';

export class GenerateCompletionUseCase {
  constructor(
    private readonly repository: LLMRepository,
    private readonly logger: Logger
  ) {}

  async execute(userInput: string): Promise<ResponseModel> {
    this.logger.info('Processing user input.', { length: userInput.length });

    try {
      const completion = await this.repository.complete(userInput);

      this.logger.info('Completion generation successful.', {
        isFunctionCall: isFunctionCallResponse(completion),
      });

      return completion;
    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        this.logger.error('LLM service unavailable.', { error: (error as Error).message });
        throw error;
      }
      throw error;
    }
  }
}
