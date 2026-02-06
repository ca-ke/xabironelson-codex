import type { CompletionResponse } from "@/core/entities/completion";
import type { CompletionRequest } from "@/core/entities/completionRequest";
import type { Message } from "@/core/entities/message";
import type { Tool } from "@/core/entities/tool";
import type { Logger } from "@/infrastructure/logging/logger";
import type { ProviderAdapter, ProviderConfig } from "./provider-adapter";

export interface LLMClient {
  complete(messages: Message[]): Promise<CompletionResponse>;
  streamComplete(messages: Message[]): AsyncGenerator<string>;
}

export class LLMClientImpl implements LLMClient {
  private readonly adapter: ProviderAdapter;
  private readonly model: string;
  private readonly logger: Logger;
  private readonly systemPrompt?: string;
  private readonly tools?: Tool[];
  private readonly temperature?: number;
  private readonly maxTokens?: number;

  constructor(
    adapter: ProviderAdapter,
    config: ProviderConfig,
    logger: Logger,
    systemPrompt?: string,
    tools?: Tool[],
    temperature?: number,
    maxTokens?: number,
  ) {
    this.adapter = adapter;
    this.model = config.model;
    this.logger = logger;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async complete(messages: Message[]): Promise<CompletionResponse> {
    this.logger.info("Calling LLM completion", {
      model: this.model,
      messageCount: messages.length,
    });

    const request = this.buildRequest(messages);
    const response = await this.adapter.complete(request);

    this.logger.info("LLM completion successful", {
      tokensUsed: response.tokensUsed,
      type: response.type,
    });

    return response;
  }

  async *streamComplete(messages: Message[]): AsyncGenerator<string> {
    this.logger.info("Calling LLM stream completion", {
      model: this.model,
      messageCount: messages.length,
    });

    const request = this.buildRequest(messages);
    yield* this.adapter.streamComplete(request);
  }

  private buildRequest(messages: Message[]): CompletionRequest {
    const allMessages = this.systemPrompt
      ? [{ role: "system" as const, content: this.systemPrompt }, ...messages]
      : messages;

    return {
      messages: allMessages,
      model: this.model,
      tools: this.tools,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    };
  }
}
