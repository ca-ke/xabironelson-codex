import {
  BoxRenderable,
  TextRenderable,
  type BoxOptions,
  type RenderContext,
} from "@opentui/core";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { CommandPalette } from "./CommandPalette";
import { COMMAND_REGISTRY } from "../commands/registry";
import type { Logger } from "@/infrastructure/logging/logger";
import type { GenerateCompletionUseCase } from "@/application/use-cases/generate-completion";

export interface REPLContainerOptions extends Omit<
  BoxOptions,
  "flexDirection"
> {
  completionUseCase: GenerateCompletionUseCase;
  logger: Logger;
}

export class REPLContainer extends BoxRenderable {
  private messageList: MessageList;
  private statusLine: TextRenderable;
  private commandPalette: CommandPalette;
  private inputBar: InputBar;
  private completionUseCase: GenerateCompletionUseCase;
  private logger: Logger;
  private isLoading: boolean = false;

  constructor(ctx: RenderContext, options: REPLContainerOptions) {
    const { completionUseCase, logger, ...boxOptions } = options;

    super(ctx, {
      flexDirection: "column",
      height: "100%",
      width: "100%",
      ...boxOptions,
    });

    this.completionUseCase = completionUseCase;
    this.logger = logger;

    this.messageList = new MessageList(ctx, {
      borderColor: "gray",
    });

    this.statusLine = new TextRenderable(ctx, {
      content: "",
      fg: "yellow",
    });

    const commandDefinitions = Object.keys(COMMAND_REGISTRY).map((name) => ({
      name,
      description: this.getCommandDescription(name),
    }));

    this.commandPalette = new CommandPalette(ctx, {
      commands: commandDefinitions,
      onSelect: (command: string): void => {
        this.inputBar.value = command;
        this.commandPalette.hide();
        this.inputBar.focus();
      },
    });

    this.inputBar = new InputBar(ctx, {
      placeholder: "Type your message...",
      onSubmit: (value: string): void => {
        this.commandPalette.hide();
        this.handleSubmit(value).catch((error: Error) => {
          this.logger.error("Submit error", { error: error.message });
        });
      },
      onChange: (value: string): void => {
        this.handleInputChange(value);
      },
    });

    this.add(this.messageList);
    this.add(this.statusLine);
    this.add(this.commandPalette);
    this.add(this.inputBar);
  }

  private getCommandDescription(name: string): string {
    const descriptions: Record<string, string> = {
      "/exit": "Exit Xabiro",
      "/config": "Show current config",
      "/help": "Show help message",
      "/toggle_logging": "Toggle logging on/off",
      "/cd": "Change working directory",
    };
    return descriptions[name] ?? name;
  }

  private handleInputChange(value: string): void {
    if (value.startsWith("/")) {
      this.commandPalette.show(value);
    } else {
      this.commandPalette.hide();
    }
  }

  private async handleSubmit(userInput: string): Promise<void> {
    if (!userInput.trim() || this.isLoading) {
      return;
    }

    try {
      this.isLoading = true;
      this.inputBar.value = "";

      this.messageList.addText(`> ${userInput}`, "green");
      this.statusLine.content = "Processing...";

      const responseRenderable = this.messageList.addMarkdown("", true);
      let fullContent = "";

      for await (const chunk of this.completionUseCase.executeStream(
        userInput,
      )) {
        fullContent += chunk;
        responseRenderable.content = fullContent;
      }

      // Finalize: disable streaming mode for stable render
      responseRenderable.streaming = false;
      responseRenderable.content = fullContent;
    } catch (error) {
      this.messageList.addText(`Error: ${(error as Error).message}`, "red");
      this.logger.error("REPL error", { error: (error as Error).message });
    } finally {
      this.statusLine.content = "";
      this.isLoading = false;
      this.inputBar.focus();
    }
  }

  override focus(): void {
    this.inputBar.focus();
  }

  getMessageList(): MessageList {
    return this.messageList;
  }

  getInputBar(): InputBar {
    return this.inputBar;
  }
}
