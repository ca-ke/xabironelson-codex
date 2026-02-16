import { DialogContainerRenderable, DialogManager } from "@opentui-ui/dialog";
import {
  BoxRenderable,
  ScrollBoxRenderable,
  TextRenderable,
  type RenderContext,
} from "@opentui/core";
import {
  loggingEventBus,
  type LogEvent,
} from "../../../infrastructure/patterns/logging-event-bus";

interface LogEntry {
  id: number;
  message: string;
  expanded: boolean;
}

export class LogsDialog {
  private manager: DialogManager;
  private container: DialogContainerRenderable;
  private unsubscribeLog: (() => void) | null = null;
  private unsubscribeToggle: (() => void) | null = null;
  private logs: LogEntry[] = [];
  private idCounter = 0;

  constructor(ctx: RenderContext) {
    this.manager = new DialogManager(ctx);
    this.container = new DialogContainerRenderable(ctx, {
      manager: this.manager,
      closeOnEscape: true,
      closeOnClickOutside: true,
      size: "large",
    });

    this.subscribe();
  }

  subscribe(): void {
    this.unsubscribeLog = loggingEventBus.onLog((event: LogEvent) => {
      const logEntry = `[${event.level.toUpperCase()}] ${event.message}`;

      this.addLog(logEntry);
    });

    this.unsubscribeToggle = loggingEventBus.onToggle(() => {
      this.toggle();
    });
  }

  unsubscribe(): void {
    if (this.unsubscribeLog) {
      this.unsubscribeLog();
      this.unsubscribeLog = null;
    }
    if (this.unsubscribeToggle) {
      this.unsubscribeToggle();
      this.unsubscribeToggle = null;
    }
  }

  private addLog(message: string): void {
    const newLog: LogEntry = {
      id: this.idCounter++,
      message,
      expanded: false,
    };
    this.logs = [newLog, ...this.logs.slice(0, 99)];
  }

  toggle(): void {
    if (this.manager.getDialogs().length > 0) {
      this.manager.closeAll();
    } else {
      this.show();
    }
  }

  show(): void {
    this.manager.show({
      content: (ctx) => {
        const container = new BoxRenderable(ctx, {
          flexDirection: "column",
          padding: 1,
          height: "100%",
        });

        const title = new TextRenderable(ctx, {
          content: "═══ Debug Logs ═══",
          fg: "cyan",
        });
        container.add(title);

        const separator = new TextRenderable(ctx, {
          content: "─".repeat(50),
          fg: "gray",
        });
        container.add(separator);

        const logsScrollBox = new ScrollBoxRenderable(ctx, {
          flexDirection: "column",
          flexGrow: 1,
        });

        if (this.logs.length === 0) {
          const emptyText = new TextRenderable(ctx, {
            content: "No logs yet...",
            fg: "gray",
          });
          logsScrollBox.add(emptyText);
        } else {
          for (const log of this.logs) {
            const rowBox = this.createLogRow(ctx, log);
            logsScrollBox.add(rowBox);
          }
        }

        container.add(logsScrollBox);
        return container;
      },
    });
  }

  private createLogRow(ctx: RenderContext, log: LogEntry): BoxRenderable {
    const rowBox = new BoxRenderable(ctx, {
      flexDirection: "column",
      padding: 1,
    });

    const isExpanded = log.expanded;
    const displayMessage = isExpanded
      ? log.message
      : log.message.length > 80
        ? log.message.substring(0, 80) + "..."
        : log.message;

    const text = new TextRenderable(ctx, {
      content: displayMessage,
      fg: isExpanded ? "white" : "gray",
    });

    rowBox.add(text);
    rowBox.onMouseUp = (): void => {
      log.expanded = !log.expanded;
      this.manager.closeAll();
      this.show();
    };

    return rowBox;
  }

  close(): void {
    this.manager.closeAll();
  }

  getContainer(): DialogContainerRenderable {
    return this.container;
  }

  clear(): void {
    this.logs = [];
    this.idCounter = 0;
    this.manager.closeAll();
  }
}
