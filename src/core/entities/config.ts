import { z } from "zod";

const PropertySchema = z.object({
  type: z.string().min(1),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

const ParametersSchema = z.object({
  type: z.string().min(1),
  required: z.array(z.string()).optional(),
  properties: z.record(z.string().min(1), PropertySchema),
});

const FunctionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: ParametersSchema,
});

const ToolSchema = z.object({
  type: z.literal("function"),
  function: FunctionSchema,
});

export const AgentSchema = z.object({
  llm: z.object({
    model: z.string().min(1),
    api_key_env: z.string().min(1),
    temperature: z.number().min(0).max(1).optional(),
    max_tokens: z.number().min(1).optional(),
    prompt: z.string().min(1).optional(),
  }),
  max_steps: z.number().min(1),
  tools: z.array(ToolSchema),
});

export type AgentConfig = z.infer<typeof AgentSchema>;
export type LLMConfig = AgentConfig["llm"];
