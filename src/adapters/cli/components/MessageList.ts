import {
  ScrollBoxRenderable,
  TextRenderable,
  MarkdownRenderable,
  SyntaxStyle,
  type ScrollBoxOptions,
  type RenderContext,
  type Renderable,
  RGBA,
} from "@opentui/core";

export interface Message {
  content: string;
  color?: string;
}

export interface MessageListOptions extends Omit<
  ScrollBoxOptions,
  "stickyScroll" | "stickyStart" | "scrollY" | "contentOptions"
> {
  messages?: Message[];
}

export class MessageList extends ScrollBoxRenderable {
  private messageRenderables: Renderable[] = [];
  private syntaxStyle: SyntaxStyle;

  constructor(ctx: RenderContext, options: MessageListOptions = {}) {
    const { messages = [], ...scrollOptions } = options;

    super(ctx, {
      flexGrow: 1,
      width: "100%",
      borderStyle: "single",
      borderColor: "gray",
      stickyScroll: true,
      stickyStart: "bottom",
      scrollY: true,
      contentOptions: {
        flexDirection: "column",
        gap: 0,
      },
      ...scrollOptions,
    });

    this.syntaxStyle = SyntaxStyle.fromStyles({
      "markup.heading.1": { fg: RGBA.fromHex("#58A6FF"), bold: true },
      "markup.list": { fg: RGBA.fromHex("#FF7B72") },
      "markup.raw": { fg: RGBA.fromHex("#A5D6FF") },
      default: { fg: RGBA.fromHex("#E6EDF3") },
    });

    for (const message of messages) {
      this.addMessage(message);
    }
  }

  addMessage(message: Message): TextRenderable {
    const textRenderable = new TextRenderable(this.ctx, {
      content: message.content,
      fg: message.color,
    });

    this.messageRenderables.push(textRenderable);
    this.add(textRenderable);

    return textRenderable;
  }

  addText(content: string, color?: string): TextRenderable {
    return this.addMessage({ content, color });
  }

  addMarkdown(content: string, streaming: boolean = false): MarkdownRenderable {
    const mdRenderable = new MarkdownRenderable(this.ctx, {
      content,
      syntaxStyle: this.syntaxStyle,
      width: "100%",
      streaming,
    });

    this.messageRenderables.push(mdRenderable);
    this.add(mdRenderable);

    return mdRenderable;
  }

  clear(): void {
    for (const renderable of this.messageRenderables) {
      this.remove(renderable.id);
      renderable.destroy();
    }
    this.messageRenderables = [];
  }

  getMessages(): Message[] {
    return this.messageRenderables.map((r) => ({
      content:
        r instanceof TextRenderable
          ? r.plainText
          : r instanceof MarkdownRenderable
            ? r.content
            : "",
    }));
  }

  get messageCount(): number {
    return this.messageRenderables.length;
  }
}
