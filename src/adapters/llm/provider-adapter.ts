import { type CompletionResponse } from "@/core/entities/completion";
import { type CompletionRequest } from "@/core/entities/completionRequest";

export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ProviderAdapter {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream?(request: CompletionRequest): AsyncIterable<CompletionResponse>;
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
}
