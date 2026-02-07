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
    this._enabled = value;
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
    this._handler(`${timestamp} - ERROR - ${message}${contextStr}`);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    this._handler(`${timestamp} - INFO - ${message}${contextStr}`);
  }

  warning(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    this._handler(`${timestamp} - WARNING - ${message}${contextStr}`);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    this._handler(`${timestamp} - DEBUG - ${message}${contextStr}`);
  }
}
