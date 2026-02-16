import type { Logger } from "@/infrastructure/logging/logger";
import { GeminiAdapter } from "../gemini/adapter";
import { KimiAdapter } from "../kimi/adapter";
import type { ProviderAdapter, ProviderConfig } from "./provider-adapter";

export type ProviderName = "gemini" | "kimi";

const PROVIDER_API_KEY_ENV: Record<ProviderName, string> = {
  gemini: "GEMINI_API_KEY",
  kimi: "KIMI_API_KEY",
};

export function resolveApiKey(provider: ProviderName): string {
  const providerKey = process.env[PROVIDER_API_KEY_ENV[provider]];
  if (providerKey) return providerKey;

  const fallbackKey = process.env.LLM_API_KEY;
  if (fallbackKey) return fallbackKey;

  throw new Error(
    `API key not found for provider "${provider}". Set ${PROVIDER_API_KEY_ENV[provider]} or LLM_API_KEY in your environment.`,
  );
}

export function resolveProvider(model: string): ProviderName {
  const slashIndex = model.indexOf("/");
  if (slashIndex !== -1) {
    const prefix = model.substring(0, slashIndex);
    if (prefix === "gemini") return "gemini";
    if (prefix === "kimi" || prefix === "moonshot") return "kimi";
  }

  // Match by model name pattern
  if (model.startsWith("gemini")) return "gemini";
  if (model.startsWith("kimi") || model.startsWith("moonshot")) return "kimi";

  throw new Error(
    `Cannot determine provider for model: "${model}". Use a prefix (e.g., gemini/model-name, kimi/model-name) or a recognized model name.`,
  );
}

export function createProviderAdapter(
  model: string,
  config: ProviderConfig,
  logger: Logger,
): ProviderAdapter {
  const provider = resolveProvider(model);
  const apiKey = resolveApiKey(provider);
  const adapterConfig: ProviderConfig = { ...config, model, apiKey };

  switch (provider) {
    case "gemini":
      return new GeminiAdapter(adapterConfig, logger);
    case "kimi":
      return new KimiAdapter(adapterConfig, logger);
  }
}
