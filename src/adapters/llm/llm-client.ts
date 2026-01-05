import type { ResponseDTO, MessageDTO } from "../../application/ports/dtos.js";
import type { LLMConfig } from "../../core/entities/config.js";
import type { ToolModel } from "../../core/entities/tool.js";
import type { Logger } from "../../infrastructure/logging/logger.js";
import type { ProviderAdapter } from "./provider-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";
import type { CompletionRequest } from "./schemas.js";

export interface LLMClient {
  complete(messages: MessageDTO[]): Promise<ResponseDTO>;
}

export class OpenAILLMClient implements LLMClient {
  private readonly adapter: ProviderAdapter;
  private readonly llmConfig: LLMConfig;
  private readonly logger: Logger;
  private readonly prompt?: string;
  private readonly tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters?: Record<string, unknown>;
    };
  }>;

  constructor(
    llmConfig: LLMConfig,
    logger: Logger,
    prompt?: string,
    tools?: ToolModel[],
  ) {
    const apiKey = process.env[llmConfig.api_key_env];
    if (!apiKey) {
      throw new Error(
        `API key not found in environment variable: ${llmConfig.api_key_env}`,
      );
    }

    this.adapter = this.createAdapter(llmConfig.model, apiKey);

    this.llmConfig = llmConfig;
    this.logger = logger;
    this.prompt = prompt;
    this.tools =
      tools?.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })) ?? [];
  }

  private createAdapter(model: string, apiKey: string): ProviderAdapter {
    if (model.startsWith("gemini/")) {
      return new GeminiAdapter(apiKey);
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  async complete(messages: MessageDTO[]): Promise<ResponseDTO> {
    try {
      this.logger.info("Calling LLM completion", {
        model: this.llmConfig.model,
        messageCount: messages.length,
        prompt: this.prompt,
      });

      const allMessages = this.prompt
        ? [{ role: "system" as const, content: this.prompt }, ...messages]
        : messages;

      const request: CompletionRequest = {
        messages: allMessages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
        model: this.llmConfig.model,
        temperature: this.llmConfig.temperature,
        maxTokens: this.llmConfig.max_tokens,
        tools: this.tools.length > 0 ? this.tools : undefined,
      };

      const response = await this.adapter.complete(request);

      this.logger.info("LLM response received", { response });

      if (response.type === "function_call") {
        this.logger.info("LLM made a tool call", {
          functionName: response.functionName,
        });
      } else {
        this.logger.info("LLM completion successful", {
          tokensUsed: response.tokensUsed,
          finishReason: response.finishReason,
        });
      }

      return response;
    } catch (error) {
      this.logger.error("Error during LLM completion", {
        error: (error as Error).message,
        errorType: (error as Error).constructor.name,
      });

      throw error;
    }
  }
}
