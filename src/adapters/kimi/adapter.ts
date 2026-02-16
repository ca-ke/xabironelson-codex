import type {
  ProviderAdapter,
  ProviderConfig,
} from "@/adapters/llm/provider-adapter";
import type { CompletionResponse } from "@/core/entities/completion";
import type { CompletionRequest } from "@/core/entities/completionRequest";
import type { StreamChunk } from "@/core/entities/stream-chunk";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from "@/core/errors/domain-errors";
import type { Logger } from "@/infrastructure/logging/logger";
import { kimiMapper } from "./mapper";
import { KimiDeltaSchema, type KimiRequest } from "./schemas";

export class KimiAdapter implements ProviderAdapter {
  private readonly config: ProviderConfig;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly logger: Logger;

  constructor(config: ProviderConfig, logger: Logger) {
    this.config = config;
    this.baseURL = config.baseURL ?? "https://api.moonshot.ai/v1";
    this.timeout = config.timeout ?? 30000;
    this.logger = logger;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const body = this.buildRequestBody(request, false);
    const url = `${this.baseURL}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: unknown = await response.json();
      return kimiMapper(data, request.model);
    } catch (error) {
      return this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async *streamComplete(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const body = this.buildRequestBody(request, true);
    const url = `${this.baseURL}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      this.logger.debug(`Request sent to ${url}`);
      this.logger.debug(`Headers ${JSON.stringify(this.buildHeaders())}`);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new LLMUnavailableError("Response body is null");
      }

      const decoder = new TextDecoder();
      const reader: ReadableStreamDefaultReader<Uint8Array> =
        response.body.getReader();
      let buffer = "";
      const toolCallBuffer = new Map<
        number,
        { name: string; arguments: string }
      >();

      while (true) {
        const result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = KimiDeltaSchema.safeParse(jsonStr);
            this.logger.debug(`Received message`, {
              message: jsonStr,
            });
            if (!parsed.success) continue;

            const delta = parsed.data.choices[0]?.delta;

            if (delta?.content) {
              yield {
                type: "text",
                content: delta.content,
              };
            }

            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const existing = toolCallBuffer.get(toolCall.index) || {
                  name: "",
                  arguments: "",
                };
                if (toolCall.function?.name) {
                  existing.name = toolCall.function.name;
                }
                if (toolCall.function?.arguments) {
                  existing.arguments += toolCall.function.arguments;
                }
                toolCallBuffer.set(toolCall.index, existing);
              }
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }

      for (const toolCall of toolCallBuffer.values()) {
        if (toolCall.name) {
          yield {
            type: "function_call",
            functionName: toolCall.name,
            functionArguments: JSON.parse(toolCall.arguments || "{}") as Record<
              string,
              unknown
            >,
          };
        }
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      ...this.config.headers,
    };
  }

  private buildRequestBody(
    request: CompletionRequest,
    stream: boolean,
  ): KimiRequest {
    const body: KimiRequest = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    if (request.tools?.length) {
      body.tools = request.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    return body;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorBody = await response.text();

    switch (response.status) {
      case 401:
        throw new LLMAuthenticationError(`Authentication failed: ${errorBody}`);
      case 429:
        throw new LLMRateLimitError(`Rate limit exceeded: ${errorBody}`);
      case 408:
      case 504:
        throw new LLMTimeoutError(`Request timed out: ${errorBody}`);
      default:
        throw new LLMUnavailableError(
          `Kimi API error ${response.status}: ${errorBody}`,
        );
    }
  }

  private handleError(error: unknown): never {
    this.logger.error(`Error happened`, {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof Error && error.name === "AbortError") {
      throw new LLMTimeoutError(`Request timed out after ${this.timeout}ms`);
    }
    if (
      error instanceof LLMAuthenticationError ||
      error instanceof LLMRateLimitError ||
      error instanceof LLMTimeoutError ||
      error instanceof LLMUnavailableError
    ) {
      throw error;
    }
    throw new LLMUnavailableError(
      `Unexpected error: ${(error as Error).message}`,
      error as Error,
    );
  }
}
