import { z } from "zod";

export const AgentSchema = z.object({
  llm: z.object({
    model: z.string().min(1),
    api_key_env: z.string().min(1),
    temperature: z.number().min(0).max(1).optional(),
    max_tokens: z.number().min(1).optional(),
    prompt: z.string().min(1).optional(),
  }),
  max_steps: z.number().min(1),
  tools: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      parameters: z.object({
        type: z.string().min(1),
        required: z.array(z.string()).min(1),
        properties: z.record(
          z.string().min(1),
          z.object({
            type: z.string().min(1),
            description: z.string().min(1),
          }),
        ),
      }),
    }),
  ),
});

export type AgentConfig = z.infer<typeof AgentSchema>;
export type LLMConfig = AgentConfig["llm"];
