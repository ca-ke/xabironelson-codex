/**
 * Abstract interface for tools that can be executed by the agent.
 */

export interface Tool {
  /**
   * Execute the tool with the given parameters.
   * @param args - Tool execution arguments
   * @returns Result of the tool execution
   */
  execute(args: Record<string, unknown>): Promise<string> | string;
}
