/**
 * Command registry mapping command names to their handlers.
 */

import type { CommandHandler } from './handlers.js';
import {
  handleChangeWorkingDirectory,
  handleConfig,
  handleExit,
  handleHelp,
  handleToggleLogging,
} from './handlers.js';

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  '/exit': handleExit,
  '/config': handleConfig,
  '/help': handleHelp,
  '/toggle_logging': handleToggleLogging,
  '/cd': handleChangeWorkingDirectory,
};
