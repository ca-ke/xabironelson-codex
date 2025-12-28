/**
 * Logger interface and implementation.
 */

export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warning(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  enabled: boolean;
}

export class BasicLogger implements Logger {
  private _enabled: boolean = true;

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.error(`${timestamp} - ERROR - ${message}${contextStr}`);
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.log(`${timestamp} - INFO - ${message}${contextStr}`);
  }

  warning(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.warn(`${timestamp} - WARNING - ${message}${contextStr}`);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this._enabled) return;
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.debug(`${timestamp} - DEBUG - ${message}${contextStr}`);
  }
}
