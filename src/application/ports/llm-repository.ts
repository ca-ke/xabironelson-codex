import type { ResponseModel } from "@/core/entities/response";

export interface LLMRepository {
  complete(userInput: string): Promise<ResponseModel>;
  streamComplete(userInput: string): AsyncGenerator<string>;
  setModel(model: string): void;
  getModel(): string;
}
