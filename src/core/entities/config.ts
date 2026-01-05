import { z } from 'zod';

export const LLMConfigSchema = z.object({
  model: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().positive().default(1500),
  api_key_env: z.string().default('LLM_API_KEY'),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const PromptConfigSchema = z.object({
  value: z.string().optional(),
  metadata: z.object({
    version: z.string(),
    description: z.string(),
  }).optional(),
});

export type PromptConfig = z.infer<typeof PromptConfigSchema>;

export const ToolConfigSchema = z.object({
  planner: z.boolean().default(false),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;

export const AgentConfigSchema = z.object({
  max_steps: z.number().positive().default(10),
  tools: ToolConfigSchema.optional(),
  prompt: z.union([z.string(), PromptConfigSchema]).optional(),
  llm: LLMConfigSchema,
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export function parseAgentConfig(config: unknown): AgentConfig {
  return AgentConfigSchema.parse(config);
}
