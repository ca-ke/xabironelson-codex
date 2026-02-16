export interface Property {
  type: string;
  description?: string;
  enum?: string[];
}

export interface Parameters {
  type: string;
  required?: string[];
  properties: Record<string, Property>;
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Parameters;
}

export interface Tool {
  type: "function";
  function: ToolFunction;
}
