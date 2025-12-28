/**
 * Data Transfer Objects for the data layer.
 */

export interface MessageDTO {
  readonly role: string;
  readonly content: string;
}

export interface BaseResponseDTO {
  readonly tokensUsed: number;
  readonly model: string;
  readonly finishReason?: string;
  readonly rawResponse?: Record<string, unknown>;
}

export interface TextResponseDTO extends BaseResponseDTO {
  readonly type: 'text';
  readonly content: string;
}

export interface FunctionCallResponseDTO extends BaseResponseDTO {
  readonly type: 'function_call';
  readonly functionName: string;
  readonly functionArguments: Record<string, unknown>;
}

export type ResponseDTO = TextResponseDTO | FunctionCallResponseDTO;

export function isTextResponseDTO(dto: ResponseDTO): dto is TextResponseDTO {
  return dto.type === 'text';
}

export function isFunctionCallResponseDTO(dto: ResponseDTO): dto is FunctionCallResponseDTO {
  return dto.type === 'function_call';
}
