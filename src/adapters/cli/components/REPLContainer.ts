import {
  BoxRenderable,
  TextRenderable,
  type BoxOptions,
  type RenderContext,
} from "@opentui/core";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { CommandPalette } from "./CommandPalette";
import type { Logger } from "@/infrastructure/logging/logger";
import type { GenerateCompletionUseCase } from "@/application/use-cases/generate-completion";
import type { CommandUseCase } from "@/application/use-cases/execute-command";
import { COMMAND_REGISTRY } from "../commands/registry";

export interface REPLContainerOptions extends Omit<
  BoxOptions,
  "flexDirection"
> {
  completionUseCase: GenerateCompletionUseCase;
  commandUseCase: CommandUseCase;
  logger: Logger;
  initialModel: string;
}

export class REPLContainer extends BoxRenderable {
  private messageList: MessageList;
  private modelLine: TextRenderable;
  private statusLine: TextRenderable;
  private commandPalette: CommandPalette;
  private inputBar: InputBar;
  private completionUseCase: GenerateCompletionUseCase;
  private commandUseCase: CommandUseCase;
  private logger: Logger;
  private isLoading: boolean = false;

  constructor(ctx: RenderContext, options: REPLContainerOptions) {
    const {
      completionUseCase,
      commandUseCase,
      logger,
      initialModel,
      ...boxOptions
    } = options;

    super(ctx, {
      flexDirection: "column",
      height: "100%",
      width: "100%",
      ...boxOptions,
    });

    this.completionUseCase = completionUseCase;
    this.commandUseCase = commandUseCase;
    this.logger = logger;

    this.messageList = new MessageList(ctx, {
      borderColor: "gray",
    });

    this.logger.handler = (message: string): void => {
      this.messageList.addMessage({
        content: message,
        color: "gray",
      });
    };

    this.modelLine = new TextRenderable(ctx, {
      content: `Model: ${initialModel}`,
      fg: "gray",
    });

    this.statusLine = new TextRenderable(ctx, {
      content: "",
      fg: "yellow",
    });

    this.commandPalette = new CommandPalette(ctx, {
      commands: Object.keys(COMMAND_REGISTRY),
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
    this.add(this.modelLine);
    this.add(this.statusLine);
    this.add(this.commandPalette);
    this.add(this.inputBar);
  }

  private handleInputChange(value: string): void {
    if (value.startsWith("/") && !this.commandPalette.hasSelectedValue) {
      this.commandPalette.show();
    } else {
      this.commandPalette.hide();
    }
  }

  private async handleSubmit(userInput: string): Promise<void> {
    if (!userInput.trim() || this.isLoading) {
      return;
    }

    if (userInput.startsWith("/")) {
      this.inputBar.value = "";
      const result = this.commandUseCase.execute(userInput);

      this.modelLine.content = `Model: ${this.completionUseCase.getModel()}`;
      this.messageList.addText(result.message, "cyan");

      if (result.shouldExit) {
        process.exit(0);
      }
      this.commandPalette.consumeValue();
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
