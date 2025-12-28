/**
 * Mappers to convert between DTOs and domain models.
 */

import type { ResponseDTO } from './dtos.js';
import { isTextResponseDTO, isFunctionCallResponseDTO } from './dtos.js';
import type { ResponseModel } from '../domain/models/response.js';

export class ResponseMapper {
  static toDomain(dto: ResponseDTO): ResponseModel {
    if (isTextResponseDTO(dto)) {
      return {
        type: 'text',
        content: dto.content,
        tokensUsed: dto.tokensUsed,
        model: dto.model,
        rawResponse: dto.rawResponse,
        finishReason: dto.finishReason,
      };
    } else if (isFunctionCallResponseDTO(dto)) {
      return {
        type: 'function_call',
        functionName: dto.functionName,
        functionArguments: dto.functionArguments,
        tokensUsed: dto.tokensUsed,
        model: dto.model,
        rawResponse: dto.rawResponse,
        finishReason: dto.finishReason,
      };
    } else {
      throw new Error('Unknown DTO response type');
    }
  }
}
