import type { CompletionResponse } from "@/core/entities/completion";
import type { CompletionRequest } from "@/core/entities/completionRequest";
import type { Message } from "@/core/entities/message";
import {
  BaseProviderAdapter,
  type ProviderConfig,
} from "@/adapters/llm/provider-adapter";
import { geminiMapper } from "./mapper";
import type { GenerateContentBody } from "./schemas";

export class GeminiAdapter extends BaseProviderAdapter {
  private readonly baseURL: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL =
      config.baseURL ?? "https://generativelanguage.googleapis.com/v1beta";
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const modelName = this.extractModelName(request.model);
    const body = this.buildRequestBody(request);
    const url = `${this.baseURL}/models/${modelName}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": this.config.apiKey,
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return geminiMapper(data, request.model);
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

  private mapRole(role: Message["role"]): "user" | "model" {
    return role === "assistant" ? "model" : "user";
  }
}
