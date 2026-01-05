import { z } from "zod";
import { BaseProviderAdapter } from "./provider-adapter.js";
import type { CompletionRequest, CompletionResponse } from "./schemas.js";
import {
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from "../../core/errors/domain-errors.js";

const GeminiPartSchema = z.object({
  text: z.string().optional(),
  functionCall: z
    .object({
      name: z.string(),
      args: z.record(z.unknown()),
    })
    .optional(),
});

const GeminiContentSchema = z.object({
  role: z.string(),
  parts: z.array(GeminiPartSchema),
});

const GeminiFunctionDeclarationSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()).optional(),
});

const GeminiToolSchema = z.object({
  functionDeclarations: z.array(GeminiFunctionDeclarationSchema),
});

const GeminiCandidateSchema = z.object({
  content: GeminiContentSchema,
  finishReason: z.string().optional(),
});

const GeminiUsageMetadataSchema = z.object({
  totalTokenCount: z.number(),
});

const GeminiResponseSchema = z.object({
  candidates: z.array(GeminiCandidateSchema),
  usageMetadata: GeminiUsageMetadataSchema.optional(),
});

export class GeminiAdapter extends BaseProviderAdapter {
  private readonly baseURL = "https://generativelanguage.googleapis.com/v1beta";

  private extractModelName(model: string): string {
    if (model.startsWith("gemini/")) {
      return model.substring(7);
    }
    return model;
  }

  private mapMessagesToGemini(
    messages: CompletionRequest["messages"]
  ): z.infer<typeof GeminiContentSchema>[] {
    return messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
  }

  private mapToolsToGemini(
    tools: CompletionRequest["tools"]
  ): z.infer<typeof GeminiToolSchema> | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return {
      functionDeclarations: tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      })),
    };
  }

  private extractSystemPrompt(messages: CompletionRequest["messages"]): string | undefined {
    const systemMessage = messages.find((msg) => msg.role === "system");
    return systemMessage?.content;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const modelName = this.extractModelName(request.model);
    const systemInstruction = this.extractSystemPrompt(request.messages);
    const contents = this.mapMessagesToGemini(request.messages);
    const tools = this.mapToolsToGemini(request.tools);

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (tools) {
      requestBody.tools = [tools];
    }

    const url = `${this.baseURL}/models/${modelName}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const geminiResponse = GeminiResponseSchema.parse(data);

      return this.mapGeminiResponseToCompletionResponse(
        geminiResponse,
        request.model,
        data
      );
    } catch (error) {
      if (
        error instanceof LLMAuthenticationError ||
        error instanceof LLMRateLimitError ||
        error instanceof LLMTimeoutError ||
        error instanceof LLMUnavailableError
      ) {
        throw error;
      }

      throw new LLMUnavailableError(
        `Erro inesperado ao chamar o serviço LLM: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string } }).error?.message ||
      response.statusText;

    switch (response.status) {
      case 401:
      case 403:
        throw new LLMAuthenticationError(
          "Falha na autenticação com o serviço LLM. Verifique suas credenciais."
        );
      case 429:
        throw new LLMRateLimitError(
          "Limite de taxa excedido. Tente novamente mais tarde."
        );
      case 408:
      case 504:
        throw new LLMTimeoutError("A requisição excedeu o tempo limite.");
      default:
        throw new LLMUnavailableError(
          `O serviço LLM retornou um erro: ${errorMessage}`
        );
    }
  }

  private mapGeminiResponseToCompletionResponse(
    geminiResponse: z.infer<typeof GeminiResponseSchema>,
    model: string,
    rawResponse: Record<string, unknown>
  ): CompletionResponse {
    if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
      throw new LLMUnavailableError("O serviço LLM retornou nenhuma resposta.");
    }

    const candidate = geminiResponse.candidates[0];
    if (!candidate) {
      throw new LLMUnavailableError("No candidate in response");
    }

    const tokensUsed = geminiResponse.usageMetadata?.totalTokenCount ?? 0;
    const finishReason = candidate.finishReason;

    const part = candidate.content.parts[0];
    if (part?.functionCall) {
      return {
        type: "function_call",
        functionName: part.functionCall.name,
        functionArguments: part.functionCall.args,
        tokensUsed,
        model,
        finishReason,
        rawResponse,
      };
    }

    const content = part?.text ?? "";

    return {
      type: "text",
      content,
      tokensUsed,
      model,
      finishReason,
      rawResponse,
    };
  }
}
