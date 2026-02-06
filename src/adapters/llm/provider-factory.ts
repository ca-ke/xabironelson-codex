import type { ProviderAdapter, ProviderConfig } from "./provider-adapter";
import { GeminiAdapter } from "../gemini/adapter";
import { KimiAdapter } from "../kimi/adapter";

type ProviderName = "gemini" | "kimi";

export function resolveProvider(model: string): ProviderName {
  // Explicit prefix: "gemini/gemini-2.5-flash" or "kimi/kimi-k2-turbo-preview"
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
): ProviderAdapter {
  const provider = resolveProvider(model);
  const adapterConfig: ProviderConfig = { ...config, model };

  switch (provider) {
    case "gemini":
      return new GeminiAdapter(adapterConfig);
    case "kimi":
      return new KimiAdapter(adapterConfig);
  }
}
