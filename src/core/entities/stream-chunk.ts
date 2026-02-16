export interface TextChunk {
  type: "text";
  content: string;
}

export interface FunctionCallChunk {
  type: "function_call";
  functionName: string;
  functionArguments: Record<string, unknown>;
}

export type StreamChunk = TextChunk | FunctionCallChunk;
