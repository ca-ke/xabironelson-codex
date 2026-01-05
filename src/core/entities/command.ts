export interface CommandResult {
  readonly message: string;
  readonly shouldExit: boolean;
}

export function createCommandResult(message: string, shouldExit: boolean = false): CommandResult {
  return { message, shouldExit };
}
