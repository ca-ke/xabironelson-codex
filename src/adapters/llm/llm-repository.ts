import type { LLMRepository } from "@/application/ports/llm-repository";
import type { ResponseModel } from "@/core/entities/response";
import type { Message } from "@/core/entities/message";
import type { LLMClient } from "./llm-client";

export class LLMRepositoryImpl implements LLMRepository {
  constructor(private readonly llmClient: LLMClient) {}

  async complete(userInput: string): Promise<ResponseModel> {
    const messages: Message[] = [
      {
        role: "user",
        content: userInput,
      },
    ];

    return this.llmClient.complete(messages);
  }

  async *streamComplete(userInput: string): AsyncGenerator<string> {
    const messages: Message[] = [
      {
        role: "user",
        content: userInput,
      },
    ];

    yield* this.llmClient.streamComplete(messages);
  }
}
