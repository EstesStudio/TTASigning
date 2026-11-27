"use client";

import {
  createElement,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

export type SignatureMode = "drawn" | "typed";

export type SignatureModeTabsPrimitives = {
  Content: ComponentType<ComponentProps<typeof TabsPrimitive.Content>>;
  List: ComponentType<ComponentProps<typeof TabsPrimitive.List>>;
  Root: ComponentType<ComponentProps<typeof TabsPrimitive.Root>>;
  Trigger: ComponentType<ComponentProps<typeof TabsPrimitive.Trigger>>;
};

export type SignatureModeTabsProps = {
  drawnPanel: ReactNode;
  mode: SignatureMode;
  onModeChange: (mode: SignatureMode) => void;
  primitives?: SignatureModeTabsPrimitives;
  typedPanel: ReactNode;
};

const defaultPrimitives: SignatureModeTabsPrimitives = {
  Content: TabsPrimitive.Content,
  List: TabsPrimitive.List,
  Root: TabsPrimitive.Root,
  Trigger: TabsPrimitive.Trigger,
};

const triggerClassName =
  "segmented-item h-auto min-h-10 flex-1 data-active:bg-white data-active:text-(--fg) data-active:shadow-[0_1px_3px_rgba(28,29,43,0.12)] after:hidden";

export function SignatureModeTabs({
  drawnPanel,
  mode,
  onModeChange,
  primitives = defaultPrimitives,
  typedPanel,
}: SignatureModeTabsProps) {
  return createElement(
    primitives.Root,
    {
      className: "min-w-0 gap-5",
      onValueChange: (value: string) => {
        if (value === "typed" || value === "drawn") {
          onModeChange(value);
        }
      },
      value: mode,
    },
    createElement(
      primitives.List,
      {
        className:
          "segmented flex h-auto w-full p-1 group-data-horizontal/tabs:h-auto",
      },
      createElement(
        primitives.Trigger,
        { className: triggerClassName, value: "typed" },
        "Type",
      ),
      createElement(
        primitives.Trigger,
        { className: triggerClassName, value: "drawn" },
        "Draw",
      ),
    ),
    // Both tabpanels stay mounted in the DOM so every tab's aria-controls
    // target always resolves. The inactive panel is hidden and its contents
    // unmount so the drawing canvas re-seeds cleanly when revisited, and
    // omitting tabindex lets Tab move straight into the active panel's
    // focusable control.
    createElement(
      primitives.Content,
      {
        className: "min-w-0 space-y-4",
        forceMount: true,
        hidden: mode !== "typed",
        tabIndex: undefined,
        value: "typed",
      },
      mode === "typed" ? typedPanel : null,
    ),
    createElement(
      primitives.Content,
      {
        className: "well min-w-0 p-3",
        forceMount: true,
        hidden: mode !== "drawn",
        tabIndex: undefined,
        value: "drawn",
      },
      mode === "drawn" ? drawnPanel : null,
    ),
  );
}
