export interface Tool {
  execute(args: Record<string, unknown>): Promise<string> | string;
}
