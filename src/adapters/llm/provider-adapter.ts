import type { CompletionRequest, CompletionResponse } from "./schemas.js";

export interface ProviderAdapter {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
}
