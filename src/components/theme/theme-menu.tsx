"use client";

import { Fragment, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  parseThemePreference,
  readThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const THEME_OPTIONS: {
  icon: LucideIcon;
  label: string;
  value: ThemePreference;
}[] = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Monitor, label: "System", value: "system" },
];

function getServerPreference(): ThemePreference {
  return "system";
}

type ThemeMenuProps = {
  align?: "center" | "end" | "start";
  className?: string;
};

/**
 * A round button that opens a choice of theme. It shows the theme on screen,
 * a sun or a moon, whether someone picked it or the system did.
 */
export function ThemeMenu({ align = "end", className }: ThemeMenuProps) {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    getServerPreference,
  );
  const current =
    THEME_OPTIONS.find((option) => option.value === preference) ??
    THEME_OPTIONS[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Theme: ${current.label}`}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-(--secondary) transition hover:bg-(--hover) hover:text-(--fg) data-[state=open]:bg-(--hover) data-[state=open]:text-(--fg)",
            className,
          )}
          type="button"
        >
          {/* The stylesheet picks the icon, so it is right from the first
              paint, before this component knows the choice. */}
          <Sun aria-hidden="true" className="size-[1.125rem] dark:hidden" />
          <Moon
            aria-hidden="true"
            className="hidden size-[1.125rem] dark:block"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) =>
            setThemePreference(parseThemePreference(value))
          }
          value={preference}
        >
          {THEME_OPTIONS.map(({ icon: Icon, label, value }) => (
            <Fragment key={value}>
              {/* Following the system is set apart from the two themes. */}
              {value === "system" ? <DropdownMenuSeparator /> : null}
              <DropdownMenuRadioItem value={value}>
                <Icon aria-hidden="true" className="text-(--tertiary)" />
                {label}
              </DropdownMenuRadioItem>
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
