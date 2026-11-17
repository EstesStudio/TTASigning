"use client";

import { appMessages, type AppMessages } from "./app-messages.ts";
import { useLocale } from "./use-locale.ts";

/** The app's messages in the language the install speaks. */
export function useAppMessages(): AppMessages {
  return appMessages(useLocale());
}
