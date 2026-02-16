import type { CommandUseCase } from "@/application/use-cases/execute-command";
import type { ExecuteToolUseCase } from "@/application/use-cases/execute-tool";
import type { GenerateCompletionUseCase } from "@/application/use-cases/generate-completion";
import type { Logger } from "@/infrastructure/logging/logger";
import {
  BoxRenderable,
  TextRenderable,
  type BoxOptions,
  type RenderContext,
} from "@opentui/core";
import { COMMAND_REGISTRY } from "../commands/registry";
import { CommandPalette } from "./CommandPalette";
import { InputBar } from "./InputBar";
import { MessageList } from "./MessageList";

export interface REPLContainerOptions extends Omit<
  BoxOptions,
  "flexDirection"
> {
  completionUseCase: GenerateCompletionUseCase;
  commandUseCase: CommandUseCase;
  toolUseCase: ExecuteToolUseCase;
  logger: Logger;
  initialModel: string;
}

export class REPLContainer extends BoxRenderable {
  private readonly messageList: MessageList;
  private readonly modelLine: TextRenderable;
  private readonly statusLine: TextRenderable;
  private readonly commandPalette: CommandPalette;
  private readonly inputBar: InputBar;
  private readonly completionUseCase: GenerateCompletionUseCase;
  private readonly commandUseCase: CommandUseCase;
  private readonly toolUseCase: ExecuteToolUseCase;
  private readonly logger: Logger;
  private isLoading = false;

  constructor(ctx: RenderContext, options: REPLContainerOptions) {
    const {
      completionUseCase,
      commandUseCase,
      toolUseCase,
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
    this.toolUseCase = toolUseCase;
    this.logger = logger;

    this.messageList = new MessageList(ctx, {
      borderColor: "gray",
    });

    this.logger.handler = (message: string): void => {
      this.messageList.addText(message, "gray");
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
      onChange: (value: string): void => this.handleInputChange(value),
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
      const fullContent = "";

      for await (const chunk of this.completionUseCase.executeStream(
        userInput,
      )) {
        if (chunk.type === "text") {
          this.messageList.addText(chunk.content);
        } else if (chunk.type === "function_call") {
          this.messageList.addFunctionCall(chunk.functionName);
          await this.toolUseCase.execute(
            chunk.functionName,
            chunk.functionArguments,
          );
        }
      }

      responseRenderable.streaming = false;
      responseRenderable.content = fullContent;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.messageList.addText(`Error: ${errorMessage}`, "red");
      this.logger.error("REPL error", { error: errorMessage });
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
