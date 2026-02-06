import type { LLMRepository } from "../ports/llm-repository.js";
import { LLMUnavailableError } from "../../core/errors/domain-errors.js";
import type { Logger } from "../../infrastructure/logging/logger.js";
import {
  isFunctionCallResponse,
  type ResponseModel,
} from "@/core/entities/response.js";

export class GenerateCompletionUseCase {
  constructor(
    private readonly repository: LLMRepository,
    private readonly logger: Logger,
  ) {}

  async execute(userInput: string): Promise<ResponseModel> {
    this.logger.info("Processing user input.", { length: userInput.length });

    try {
      const completion = await this.repository.complete(userInput);

      this.logger.info("Completion generation successful.", {
        isFunctionCall: isFunctionCallResponse(completion),
      });

      return completion;
    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        this.logger.error("LLM service unavailable.", {
          error: (error as Error).message,
        });
        throw error;
      }
      throw error;
    }
  }

  setModel(model: string): void {
    this.repository.setModel(model);
    this.logger.info("Model changed.", { model });
  }

  getModel(): string {
    return this.repository.getModel();
  }

  async *executeStream(userInput: string): AsyncGenerator<string> {
    this.logger.info("Processing user input (stream).", {
      length: userInput.length,
    });

    try {
      yield* this.repository.streamComplete(userInput);
    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        this.logger.error("LLM service unavailable.", {
          error: (error as Error).message,
        });
        throw error;
      }
      throw error;
    }
  }
}
