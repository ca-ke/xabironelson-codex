import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChoiceSchema = z.object({
  index: z.number().int(),
  message: MessageSchema,
  finish_reason: z.string().nullable().optional(),
});

const UsageSchema = z.object({
  prompt_tokens: z.number().int().optional(),
  completion_tokens: z.number().int().optional(),
  total_tokens: z.number().int().optional(),
  cached_tokens: z.number().int().optional(),
});

export const KimiResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().int().optional(),
  model: z.string().optional(),
  choices: z.array(ChoiceSchema),
  usage: UsageSchema.optional(),
});

export const KimiRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(MessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
  max_completion_tokens: z.number().min(1).max(4096).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().min(1).max(5).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  response_format: z.object({ type: z.string() }).optional(),
  stream: z.boolean().optional(),
  tools: z
    .array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          parameters: z.object({
            type: z.string().min(1),
            properties: z.record(z.string(), z.any()),
            required: z.array(z.string()).optional(),
          }),
        }),
      }),
    )
    .optional(),
});

export const KimiDeltaSchema = z.object({
  choices: z.array(
    z.object({
      index: z.number().min(0),
      delta: z.object({
        role: z.enum(["assistant"]).optional(),
        content: z.string().optional(),
        tool_calls: z
          .array(
            z.object({
              index: z.number().min(0),
              id: z.string().uuid().optional(),
              type: z.literal("function"),
              function: z.object({
                name: z.string().min(1).optional(),
                arguments: z.string().optional(),
              }),
            }),
          )
          .optional(),
      }),
      finish_reason: z.string().nullable().optional(),
    }),
  ),
});

export type KimiDelta = z.infer<typeof KimiDeltaSchema>;
export type KimiResponse = z.infer<typeof KimiResponseSchema>;
export type KimiRequest = z.infer<typeof KimiRequestSchema>;
