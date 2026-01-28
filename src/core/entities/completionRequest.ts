import type { Message } from "./message.js";
import type { Tool } from "./tool.js";

export interface CompletionRequest {
  messages: Message[];
  model: string;
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
}
