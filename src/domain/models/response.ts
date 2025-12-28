/**
 * Domain models for LLM responses.
 */

export interface BaseResponseModel {
  readonly tokensUsed: number;
  readonly model: string;
  readonly rawResponse?: Record<string, unknown>;
  readonly finishReason?: string;
}

export interface TextResponseModel extends BaseResponseModel {
  readonly type: 'text';
  readonly content: string;
}

export interface FunctionCallResponseModel extends BaseResponseModel {
  readonly type: 'function_call';
  readonly functionName: string;
  readonly functionArguments: Record<string, unknown>;
}

export type ResponseModel = TextResponseModel | FunctionCallResponseModel;

/**
 * Type guards for response models.
 */
export function isTextResponse(response: ResponseModel): response is TextResponseModel {
  return response.type === 'text';
}

export function isFunctionCallResponse(response: ResponseModel): response is FunctionCallResponseModel {
  return response.type === 'function_call';
}
