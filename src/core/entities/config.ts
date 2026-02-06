export interface LLMConfig {
  model: string;
  temperature?: number;
  max_tokens?: number;
  api_key_env: string;
  prompt?: string | { value: string };
}

export interface AgentConfig {
  llm: LLMConfig;
  prompt?: string | { value: string };
  max_steps?: number;
  tools?: Record<string, boolean>;
}

export function parseAgentConfig(rawConfig: unknown): AgentConfig {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Invalid configuration: must be an object");
  }

  const config = rawConfig as Record<string, unknown>;

  // Extract LLM config
  const llmRaw = config.llm;
  if (!llmRaw || typeof llmRaw !== "object") {
    throw new Error("Invalid configuration: llm section is required");
  }

  const llm = llmRaw as Record<string, unknown>;
  const model = llm.model as string;
  if (!model) {
    throw new Error("Invalid configuration: llm.model is required");
  }

  const apiKeyEnv = (llm.api_key_env as string) || "GEMINI_API_KEY";

  const llmConfig: LLMConfig = {
    model,
    api_key_env: apiKeyEnv,
    temperature: llm.temperature as number | undefined,
    max_tokens: llm.max_tokens as number | undefined,
    prompt: llm.prompt as string | { value: string } | undefined,
  };

  const agentConfig: AgentConfig = {
    llm: llmConfig,
    prompt: config.prompt as string | { value: string } | undefined,
    max_steps: config.max_steps as number | undefined,
    tools: config.tools as Record<string, boolean> | undefined,
  };

  return agentConfig;
}
