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
  private allCommands: string[];
  private selectRenderable: SelectRenderable;
  private onSelectCallback?: (command: string) => void;
  private _hasSelectedValue: boolean;

  constructor(ctx: RenderContext, options: CommandPaletteOptions) {
    const { commands, onSelect, ...boxOptions } = options;

    const itemHeight = 2;
    const selectHeight = commands.length * itemHeight;
    const boxHeight = selectHeight + 2;

    super(ctx, {
      width: "100%",
      height: boxHeight,
      visible: false,
      flexDirection: "column",
      ...boxOptions,
    });

    this.allCommands = commands;
    this.onSelectCallback = onSelect;
    this._hasSelectedValue = false;

    this.selectRenderable = new SelectRenderable(ctx, {
      id: "menu",
      width: 60,
      height: selectHeight,
      options: this.allCommands.map((value) => {
        return {
          name: value,
          description: "",
        };
      }),
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
