export interface CommandResult {
  message: string;
  shouldExit: boolean;
}

export function createCommandResult(
  message: string,
  shouldExit: boolean,
): CommandResult {
  return { message, shouldExit };
}
