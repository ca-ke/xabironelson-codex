import type { ResponseModel } from "@/core/entities/response";
import type { StreamChunk } from "@/core/entities/stream-chunk";

export interface LLMRepository {
  complete(userInput: string): Promise<ResponseModel>;
  streamComplete(userInput: string): AsyncGenerator<StreamChunk>;
  setModel(model: string): void;
  getModel(): string;
}
