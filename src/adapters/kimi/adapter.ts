import type { CompletionResponse } from "@/core/entities/completion";
import type { CompletionRequest } from "@/core/entities/completionRequest";
import type {
  ProviderAdapter,
  ProviderConfig,
} from "@/adapters/llm/provider-adapter";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from "@/core/errors/domain-errors";
import { kimiMapper } from "./mapper";
import type { KimiRequestBody, KimiStreamDelta } from "./schemas";

export class KimiAdapter implements ProviderAdapter {
  private readonly config: ProviderConfig;
  private readonly baseURL: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseURL = config.baseURL ?? "https://api.moonshot.ai/v1";
    this.timeout = config.timeout ?? 30000;
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

  async *streamComplete(request: CompletionRequest): AsyncGenerator<string> {
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
            const chunk = JSON.parse(jsonStr) as KimiStreamDelta;
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // skip malformed JSON chunks
          }
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
  ): KimiRequestBody {
    const body: KimiRequestBody = {
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
