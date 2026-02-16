import { type CompletionResponse } from "@/core/entities/completion";
import { type CompletionRequest } from "@/core/entities/completionRequest";
import type { StreamChunk } from "@/core/entities/stream-chunk";
import type { Tool } from "@/core/entities/tool";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  tools: Tool[];
}

export interface ProviderAdapter {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncGenerator<StreamChunk>;
}
