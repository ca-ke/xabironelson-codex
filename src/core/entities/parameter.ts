import type { Property } from "./property";

export interface Parameter {
  type: string;
  required: Array<string>;
  properties: Record<string, Property>;
}
