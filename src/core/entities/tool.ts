import type { Parameter } from "./parameter";

export interface Tool {
  name: string;
  description: string;
  parameters: Parameter;
}
