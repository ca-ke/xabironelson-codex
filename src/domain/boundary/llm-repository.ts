/**
 * Repository interface for LLM interactions.
 */

import type { ResponseModel } from '../models/response.js';

export interface LLMRepository {
  /**
   * Generate a completion for the given user input.
   * @param userInput - The user's input message
   * @returns The LLM's response
   */
  complete(userInput: string): Promise<ResponseModel>;
}
