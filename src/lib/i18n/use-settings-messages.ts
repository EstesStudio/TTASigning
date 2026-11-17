"use client";

import { useLocale } from "./use-locale.ts";
import {
  settingsMessages,
  type SettingsMessages,
} from "./settings-messages.ts";

/** The Settings page's messages in the language the install speaks. */
export function useSettingsMessages(): SettingsMessages {
  return settingsMessages(useLocale());
}
