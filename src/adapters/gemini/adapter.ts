import {
  type ProviderAdapter,
  type ProviderConfig,
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
import { geminiMapper } from "./mapper";
import type { GeminiResponse, GenerateContentBody } from "./schemas";

export class GeminiAdapter implements ProviderAdapter {
  private readonly config: ProviderConfig;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly logger: Logger;

  constructor(config: ProviderConfig, logger: Logger) {
    this.config = config;
    this.baseURL =
      config.baseURL ?? "https://generativelanguage.googleapis.com/v1beta";
    this.timeout = config.timeout ?? 30000;
    this.logger = logger;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const modelName = this.extractModelName(request.model);
    const body = this.buildRequestBody(request);
    const url = `${this.baseURL}/models/${modelName}:generateContent`;

    this.logger.info(
      `Completing request with model ${modelName} with body ${JSON.stringify(body)}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": this.config.apiKey,
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: unknown = await response.json();
      return geminiMapper(data, request.model);
    } catch (error) {
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorBody = await response.text();

    switch (response.status) {
      case 401:
      case 403:
        throw new LLMAuthenticationError(`Authentication failed: ${errorBody}`);
      case 429:
        throw new LLMRateLimitError(`Rate limit exceeded: ${errorBody}`);
      case 408:
      case 504:
        throw new LLMTimeoutError(`Request timed out: ${errorBody}`);
      default:
        throw new LLMUnavailableError(
          `Gemini API error ${response.status}: ${errorBody}`,
        );
    }
  }

  private extractModelName(model: string): string {
    if (model.startsWith("gemini/")) {
      return model.substring(7);
    }
    return model;
  }

  private buildRequestBody(request: CompletionRequest): GenerateContentBody {
    const systemMessage = request.messages.find((m) => m.role === "system");
    const conversationMessages = request.messages.filter(
      (m) => m.role !== "system",
    );

    const body: GenerateContentBody = {
      contents: conversationMessages.map((m) => ({
        role: this.mapRole(m.role),
        parts: [{ text: m.content }],
      })),
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (request.tools?.length) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ];
    }

    if (request.temperature !== undefined || request.maxTokens !== undefined) {
      body.generationConfig = {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      };
    }

    return body;
  }

  async *streamComplete(
    request: CompletionRequest,
  ): AsyncGenerator<StreamChunk> {
    const modelName = this.extractModelName(request.model);
    const body = this.buildRequestBody(request);
    const url = `${this.baseURL}/models/${modelName}:streamGenerateContent?alt=sse`;

    this.logger.info(
      `Completing request with model ${modelName} with body ${JSON.stringify(body)}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": this.config.apiKey,
          "Content-Type": "application/json",
          ...this.config.headers,
        },
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
      let accumulatedFunctionCall: { name: string; args: string } | undefined;

      while (true) {
        const result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const chunk = JSON.parse(jsonStr) as GeminiResponse;
            const part = chunk?.candidates?.[0]?.content?.parts?.[0];
            if (!part) continue;

            if ("functionCall" in part && part.functionCall) {
              if (accumulatedFunctionCall) {
                yield {
                  type: "function_call",
                  functionName: accumulatedFunctionCall.name,
                  functionArguments: JSON.parse(accumulatedFunctionCall.args) as Record<string, unknown>,
                };
              }
              accumulatedFunctionCall = {
                name: part.functionCall.name,
                args: JSON.stringify(part.functionCall.args || {}),
              };
            } else if (part && "text" in part) {
              yield {
                type: "text",
                content: part.text,
              };
            }
          } catch {
            // skip malformed JSON chunks
          }
        }
      }

      if (accumulatedFunctionCall) {
        yield {
          type: "function_call",
          functionName: accumulatedFunctionCall.name,
          functionArguments: JSON.parse(accumulatedFunctionCall.args) as Record<string, unknown>,
        };
      }
    } catch (error) {
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapRole(role: "user" | "assistant" | "system"): "user" | "model" {
    if (role === "system") {
      throw new Error(
        "System role should be filtered before mapping. This is a bug.",
      );
    }
    return role === "assistant" ? "model" : "user";
  }
}
