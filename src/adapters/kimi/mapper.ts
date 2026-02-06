import type { CompletionResponse } from "@/core/entities/completion";
import { KimiResponseSchema } from "./schemas";

export const kimiMapper = (
  raw: unknown,
  model: string,
): CompletionResponse => {
  const parsed = KimiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid Kimi response: ${parsed.error.message}`);
  }

  const choice = parsed.data.choices[0];
  if (!choice) {
    throw new Error("Kimi response has no choices");
  }

  const content = choice.message.content;
  const tokensUsed = parsed.data.usage?.total_tokens ?? 0;
  const finishReason = choice.finish_reason ?? undefined;

  return {
    type: "text",
    content,
    tokensUsed,
    model,
    finishReason,
  };
};
