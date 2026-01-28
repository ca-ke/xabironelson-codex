import { type CompletionResponse } from "@/core/entities/completion";
import { type CompletionRequest } from "@/core/entities/completionRequest";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ProviderAdapter {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}
