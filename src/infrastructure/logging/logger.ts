import { loggingEventBus } from "../patterns/logging-event-bus";

export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warning(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  enabled: boolean;
  handler: (message: string, context?: Record<string, unknown>) => void;
}

export class BasicLogger implements Logger {
  private _enabled: boolean = true;
  private _handler: (
    message: string,
    context?: Record<string, unknown>,
  ) => void = (message, context) => {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    console.log(`${timestamp} - INFO - ${message}${contextStr}`);
  };

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    const oldValue = this._enabled;
    this._enabled = value;
    // Emit state change event when logging is toggled
    if (oldValue !== value) {
      loggingEventBus.emitStateChange(value);
    }
  }

  set handler(
    value: (message: string, context?: Record<string, unknown>) => void,
  ) {
    this._handler = value;
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    const logMessage = `${timestamp} - ERROR - ${message}${contextStr}`;
    this._handler(logMessage);
    loggingEventBus.emitLog({
      level: "error",
      message,
      context,
      timestamp,
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    const logMessage = `${timestamp} - INFO - ${message}${contextStr}`;
    this._handler(logMessage);
    loggingEventBus.emitLog({
      level: "info",
      message,
      context,
      timestamp,
    });
  }

  warning(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    const logMessage = `${timestamp} - WARNING - ${message}${contextStr}`;
    this._handler(logMessage);
    loggingEventBus.emitLog({
      level: "warning",
      message,
      context,
      timestamp,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    const logMessage = `${timestamp} - DEBUG - ${message}${contextStr}`;
    this._handler(logMessage);
    loggingEventBus.emitLog({
      level: "debug",
      message,
      context,
      timestamp,
    });
  }
}
