import type { CompletionResponse } from "@/core/entities/completion";
import type { CompletionRequest } from "@/core/entities/completionRequest";
import {
  type ProviderAdapter,
  type ProviderConfig,
} from "@/adapters/llm/provider-adapter";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from "@/core/errors/domain-errors";
import { geminiMapper } from "./mapper";
import type { GenerateContentBody } from "./schemas";

export class GeminiAdapter implements ProviderAdapter {
  private readonly config: ProviderConfig;
  private readonly baseURL: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.baseURL =
      config.baseURL ?? "https://generativelanguage.googleapis.com/v1beta";
    this.timeout = config.timeout ?? 30000;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const modelName = this.extractModelName(request.model);
    const body = this.buildRequestBody(request);
    const url = `${this.baseURL}/models/${modelName}:generateContent`;

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

      const data = await response.json();
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
            name: t.name,
            description: t.description,
            parameters: t.parameters,
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

  private mapRole(role: "user" | "assistant" | "system"): "user" | "model" {
    if (role === "system") {
      throw new Error(
        "System role should be filtered before mapping. This is a bug.",
      );
    }
    return role === "assistant" ? "model" : "user";
  }
}
