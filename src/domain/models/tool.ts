/**
 * Tool model for LLM function calling.
 */

import type { Tool } from '../boundary/tool.js';

export interface ToolModel {
  readonly name: string;
  readonly description: string;
  readonly parameters?: Record<string, unknown>;
  readonly instance?: Tool;
}

export function createToolModel(
  name: string,
  description: string,
  parameters?: Record<string, unknown>,
  instance?: Tool
): ToolModel {
  return {
    name,
    description,
    parameters,
    instance,
  };
}
