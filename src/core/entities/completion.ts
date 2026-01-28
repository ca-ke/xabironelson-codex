export interface TextCompletion {
  type: "text";
  content: string;
  tokensUsed: number;
  model: string;
  finishReason?: string;
}

export interface FunctionCallCompletion {
  type: "function_call";
  functionName: string;
  functionArguments: Record<string, unknown>;
  tokensUsed: number;
  model: string;
  finishReason?: string;
}

export type CompletionResponse = TextCompletion | FunctionCallCompletion;
