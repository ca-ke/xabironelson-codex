import type { CompletionResponse } from "@/core/entities/completion";
import { GeminiResponseSchema } from "./schemas";

export const geminiMapper = (
  raw: unknown,
  model: string,
): CompletionResponse => {
  const parsed = GeminiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Gemini response: ${parsed.error.message}`);
  }

  const candidate = parsed.data.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini response has no candidates");
  }

  const part = candidate.content.parts[0];
  if (!part) {
    throw new Error("Gemini response has no parts");
  }

  const tokensUsed = parsed.data.usageMetadata?.totalTokenCount ?? 0;
  const finishReason = candidate.finishReason;

  if ("functionCall" in part && part.functionCall) {
    return {
      type: "function_call",
      functionName: part.functionCall.name,
      functionArguments: part.functionCall.args ?? {},
      tokensUsed,
      model,
      finishReason,
    };
  }

  if ("text" in part) {
    return {
      type: "text",
      content: part.text,
      tokensUsed,
      model,
      finishReason,
    };
  }

  throw new Error("Gemini response part is neither text nor function call");
};
