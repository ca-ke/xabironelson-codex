import type { RenderContext } from "@opentui/core";
import { BoxRenderable, TextRenderable, type BoxOptions } from "@opentui/core";

export interface WelcomePanelProps extends Omit<
  BoxOptions,
  "flexDirection" | "borderStyle"
> {
  title: string;
  subtitle: string;
}

export class WelcomePanel extends BoxRenderable {
  private titleRenderable?: TextRenderable;
  private subtitleRenderable?: TextRenderable;
  private instructionsRenderable?: TextRenderable;

  constructor(ctx: RenderContext, options: WelcomePanelProps) {
    super(ctx, {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "cyan",
      padding: 1,
      marginBottom: 1,
    });

    this.titleRenderable = new TextRenderable(ctx, {
      content: options.title,
      fg: "cyan",
    });
    this.add(this.titleRenderable);

    this.subtitleRenderable = new TextRenderable(ctx, {
      content: options.subtitle,
      fg: "gray",
    });
    this.add(this.subtitleRenderable);

    this.instructionsRenderable = new TextRenderable(ctx, {
      content: "Commands: /help for assistance, Ctrl+C to exit",
      fg: "gray",
    });
    this.add(this.instructionsRenderable);
  }
}
