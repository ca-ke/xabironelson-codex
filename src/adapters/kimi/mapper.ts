import type { CompletionResponse } from "@/core/entities/completion";
import { KimiResponseSchema } from "./schemas";

export const kimiMapper = (raw: unknown, model: string): CompletionResponse => {
  const parsed = KimiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Kimi response: ${parsed.error.message}`);
  }

  const choice = parsed.data.choices[0];
  if (!choice) {
    throw new Error("Kimi response has no choices");
  }

  const tokensUsed = parsed.data.usage?.total_tokens ?? 0;
  const finishReason = choice.finish_reason ?? undefined;

  const toolCalls = (
    choice.message as unknown as {
      tool_calls?: { function: { name: string; arguments: string } }[];
    }
  ).tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0];
    if (toolCall?.function?.name) {
      return {
        type: "function_call",
        functionName: toolCall.function.name,
        functionArguments: JSON.parse(
          toolCall.function.arguments || "{}",
        ) as Record<string, unknown>,
        tokensUsed,
        model,
        finishReason,
      };
    }
  }

  return {
    type: "text",
    content: choice.message.content,
    tokensUsed,
    model,
    finishReason,
  };
};
