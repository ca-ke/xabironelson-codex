import type { ResponseModel } from '../../core/entities/response.js';

export interface LLMRepository {
  complete(userInput: string): Promise<ResponseModel>;
}
