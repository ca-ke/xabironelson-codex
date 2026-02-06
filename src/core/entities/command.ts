export interface CommandAction {
  type: string;
  payload: string;
}

export interface CommandResult {
  message: string;
  shouldExit: boolean;
  action?: CommandAction;
}

export function createCommandResult(
  message: string,
  shouldExit: boolean,
  action?: CommandAction,
): CommandResult {
  return { message, shouldExit, action };
}
