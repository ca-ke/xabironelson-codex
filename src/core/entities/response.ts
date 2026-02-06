import type { CompletionResponse } from "./completion";

export type ResponseModel = CompletionResponse;

export function isTextResponse(
  response: ResponseModel
): response is Extract<ResponseModel, { type: "text" }> {
  return response.type === "text";
}

export function isFunctionCallResponse(
  response: ResponseModel
): response is Extract<ResponseModel, { type: "function_call" }> {
  return response.type === "function_call";
}
