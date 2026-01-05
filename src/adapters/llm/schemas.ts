import { z } from "zod";

export const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const ToolFunctionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()).optional(),
});

export const ToolSchema = z.object({
  type: z.literal("function"),
  function: ToolFunctionSchema,
});

export const CompletionRequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(ToolSchema).optional(),
});

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

export const TextCompletionResponseSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  tokensUsed: z.number(),
  model: z.string(),
  finishReason: z.string().optional(),
  rawResponse: z.record(z.unknown()).optional(),
});

export const FunctionCallCompletionResponseSchema = z.object({
  type: z.literal("function_call"),
  functionName: z.string(),
  functionArguments: z.record(z.unknown()),
  tokensUsed: z.number(),
  model: z.string(),
  finishReason: z.string().optional(),
  rawResponse: z.record(z.unknown()).optional(),
});

export const CompletionResponseSchema = z.discriminatedUnion("type", [
  TextCompletionResponseSchema,
  FunctionCallCompletionResponseSchema,
]);

export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;
