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

export interface KimiRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters?: Record<string, unknown>;
    };
  }[];
}

export interface KimiStreamDelta {
  choices?: {
    index: number;
    delta: {
      content?: string;
      tool_calls?: {
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }[];
    };
    finish_reason?: string | null;
  }[];
}

export type KimiResponse = z.infer<typeof KimiResponseSchema>;
