import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  type BoxOptions,
  type RenderContext,
  type SelectOption,
} from "@opentui/core";

export interface CommandDefinition {
  name: string;
  description: string;
}

export interface CommandPaletteOptions extends Omit<BoxOptions, "position"> {
  commands: CommandDefinition[];
  onSelect?: (command: string) => void;
}

export class CommandPalette extends BoxRenderable {
  private select: SelectRenderable;
  private allCommands: CommandDefinition[];
  private filteredCommands: CommandDefinition[];
  private onSelectCallback?: (command: string) => void;

  constructor(ctx: RenderContext, options: CommandPaletteOptions) {
    const { commands, onSelect, ...boxOptions } = options;

    super(ctx, {
      position: "absolute",
      bottom: 4,
      left: 1,
      width: 40,
      borderStyle: "single",
      borderColor: "cyan",
      backgroundColor: "#1a1a2e",
      visible: false,
      ...boxOptions,
    });

    this.allCommands = commands;
    this.filteredCommands = commands;
    this.onSelectCallback = onSelect;

    this.select = new SelectRenderable(ctx, {
      width: "100%",
      options: this.toSelectOptions(commands),
      backgroundColor: "#1a1a2e",
      textColor: "white",
      focusedBackgroundColor: "#16213e",
      focusedTextColor: "cyan",
      selectedBackgroundColor: "#0f3460",
      selectedTextColor: "cyan",
      showDescription: true,
      descriptionColor: "gray",
      wrapSelection: true,
    });

    this.select.on(
      SelectRenderableEvents.ITEM_SELECTED,
      (_option: SelectOption) => {
        const selected = this.select.getSelectedOption();
        if (selected && this.onSelectCallback) {
          this.onSelectCallback(selected.name);
        }
      },
    );

    this.add(this.select);
  }

  private toSelectOptions(commands: CommandDefinition[]): SelectOption[] {
    return commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
    }));
  }

  show(filter?: string): void {
    if (filter) {
      this.filteredCommands = this.allCommands.filter((cmd) =>
        cmd.name.startsWith(filter),
      );
    } else {
      this.filteredCommands = this.allCommands;
    }

    if (this.filteredCommands.length === 0) {
      this.hide();
      return;
    }

    this.select.options = this.toSelectOptions(this.filteredCommands);
    this.select.setSelectedIndex(0);
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  get isOpen(): boolean {
    return this.visible;
  }

  getSelectedCommand(): string | null {
    const selected = this.select.getSelectedOption();
    return selected?.name ?? null;
  }

  moveUp(): void {
    this.select.moveUp();
  }

  moveDown(): void {
    this.select.moveDown();
  }

  selectCurrent(): void {
    this.select.selectCurrent();
  }

  set onSelect(callback: (command: string) => void) {
    this.onSelectCallback = callback;
  }
}
