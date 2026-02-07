import type { SelectOption, BoxOptions, RenderContext } from "@opentui/core";
import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
} from "@opentui/core";

export interface CommandPaletteOptions extends BoxOptions {
  commands: string[];
  onSelect?: (command: string) => void;
}

export class CommandPalette extends BoxRenderable {
  private static readonly ITEM_HEIGHT = 2;
  private static readonly BOX_PADDING = 2;

  private readonly commands: string[];
  private readonly selectRenderable: SelectRenderable;
  private readonly onSelectCallback?: (command: string) => void;
  private _hasSelectedValue = false;

  constructor(ctx: RenderContext, options: CommandPaletteOptions) {
    const { commands, onSelect, ...boxOptions } = options;

    const selectHeight = commands.length * CommandPalette.ITEM_HEIGHT;

    super(ctx, {
      width: "100%",
      height: selectHeight + CommandPalette.BOX_PADDING,
      visible: false,
      flexDirection: "column",
      ...boxOptions,
    });

    this.commands = commands;
    this.onSelectCallback = onSelect;

    this.selectRenderable = new SelectRenderable(ctx, {
      id: "menu",
      width: 60,
      height: selectHeight,
      options: this.commands.map((name) => ({ name, description: "" })),
      backgroundColor: "#0f172a",
      textColor: "#94a3b8",
      focusedBackgroundColor: "#1e293b",
      focusedTextColor: "#5eead4",
      selectedBackgroundColor: "#164e63",
      selectedTextColor: "#5eead4",
      showDescription: true,
      descriptionColor: "#475569",
      wrapSelection: true,
    });

    this.selectRenderable.on(
      SelectRenderableEvents.ITEM_SELECTED,
      (_: number, option: SelectOption) => {
        this.onSelectCallback?.(option.name);
        this._hasSelectedValue = true;
      },
    );

    this.add(this.selectRenderable);
  }

  show(): void {
    this.visible = true;
    this.selectRenderable.focus();
  }

  hide(): void {
    this.visible = false;
  }

  get hasSelectedValue(): boolean {
    return this._hasSelectedValue;
  }

  consumeValue(): void {
    this._hasSelectedValue = false;
  }
}
