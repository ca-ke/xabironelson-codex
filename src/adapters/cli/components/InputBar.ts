import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  type BoxOptions,
  type RenderContext,
} from "@opentui/core";

export interface InputBarOptions extends Omit<
  BoxOptions,
  "height" | "paddingLeft" | "paddingRight"
> {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}

export class InputBar extends BoxRenderable {
  private input: InputRenderable;
  private onSubmitCallback?: (value: string) => void;
  private onChangeCallback?: (value: string) => void;

  constructor(ctx: RenderContext, options: InputBarOptions = {}) {
    const {
      placeholder = "Type your message...",
      onSubmit,
      onChange,
      ...boxOptions
    } = options;

    super(ctx, {
      width: "100%",
      height: 3,
      borderStyle: "single",
      borderColor: "cyan",
      paddingLeft: 1,
      paddingRight: 1,
      ...boxOptions,
    });

    this.onSubmitCallback = onSubmit;
    this.onChangeCallback = onChange;

    this.input = new InputRenderable(ctx, {
      width: "100%",
      placeholder,
      focusedBackgroundColor: "#1a1a1a",
    });

    this.input.on(InputRenderableEvents.ENTER, () => {
      const value = this.input.value;
      if (value.trim() && this.onSubmitCallback) {
        this.onSubmitCallback(value);
        this.input.value = "";
      }
    });

    this.input.on(InputRenderableEvents.INPUT, () => {
      this.onChangeCallback?.(this.input.value);
    });

    this.add(this.input);
  }

  override focus(): void {
    this.input.focus();
  }

  override blur(): void {
    this.input.blur();
  }

  get value(): string {
    return this.input.value;
  }

  set value(value: string) {
    this.input.value = value;
  }

  set placeholder(value: string) {
    this.input.placeholder = value;
  }

  set onSubmit(callback: (value: string) => void) {
    this.onSubmitCallback = callback;
  }

  set onChange(callback: (value: string) => void) {
    this.onChangeCallback = callback;
  }
}
