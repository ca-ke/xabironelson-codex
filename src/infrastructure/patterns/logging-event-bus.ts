import { EventEmitter } from "./event-emitter";

export interface LogEvent {
  level: "debug" | "info" | "warning" | "error";
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface LoggingStateEvent {
  enabled: boolean;
}

class LoggingEventBus {
  private static instance: LoggingEventBus;
  private emitter: EventEmitter<LogEvent | LoggingStateEvent>;

  private constructor() {
    this.emitter = new EventEmitter();
  }

  static getInstance(): LoggingEventBus {
    if (!LoggingEventBus.instance) {
      LoggingEventBus.instance = new LoggingEventBus();
    }
    return LoggingEventBus.instance;
  }

  onLog(callback: (event: LogEvent) => void): () => void {
    return this.emitter.on(
      "log",
      callback as (data: LogEvent | LoggingStateEvent) => void,
    );
  }

  onStateChange(callback: (event: LoggingStateEvent) => void): () => void {
    return this.emitter.on(
      "stateChange",
      callback as (data: LogEvent | LoggingStateEvent) => void,
    );
  }

  emitLog(event: LogEvent): void {
    this.emitter.emit("log", event);
  }

  emitStateChange(enabled: boolean): void {
    this.emitter.emit("stateChange", { enabled });
  }

  onToggle(callback: () => void): () => void {
    return this.emitter.on(
      "toggle",
      callback as (data: LogEvent | LoggingStateEvent) => void,
    );
  }

  emitToggle(): void {
    this.emitter.emit(
      "toggle",
      undefined as unknown as LogEvent | LoggingStateEvent,
    );
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const loggingEventBus = LoggingEventBus.getInstance();
