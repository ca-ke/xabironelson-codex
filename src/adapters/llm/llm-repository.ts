import type { LLMRepository } from "../../application/ports/llm-repository.js";
import type { ResponseModel } from "../../core/entities/response.js";
import type { LLMClient } from "./llm-client.js";
import type { Logger } from "../../infrastructure/logging/logger.js";
import type { MessageDTO } from "../../application/ports/dtos.js";
import { ResponseMapper } from "./mappers.js";

export class LLMRepositoryImpl implements LLMRepository {
  private readonly shortTermMemory: MessageDTO[] = [];

  constructor(
    private readonly llmClient: LLMClient,
    private readonly logger: Logger,
  ) {}

  async complete(userInput: string): Promise<ResponseModel> {
    this.shortTermMemory.push({
      role: "user",
      content: userInput,
    });

    this.logger.info("Generating completion", {
      memorySize: this.shortTermMemory.length,
    });

    const responseDto = await this.llmClient.complete(this.shortTermMemory);

    if (responseDto.type === "text") {
      this.shortTermMemory.push({
        role: "assistant",
        content: responseDto.content,
      });
    } else if (responseDto.type === "function_call") {
      this.shortTermMemory.push({
        role: "assistant",
        content: `Function call: ${responseDto.functionName} with arguments ${JSON.stringify(responseDto.functionArguments)}`,
      });
    }

    const domainResponse = ResponseMapper.toDomain(responseDto);

    this.logger.info("Completion generated successfully", {
      tokensUsed: domainResponse.tokensUsed,
      memorySize: this.shortTermMemory.length,
    });

    return domainResponse;
  }
}
