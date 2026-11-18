"use client";

import { useLayoutEffect } from "react";

import {
  applyThemePreference,
  readThemePreference,
  subscribeToThemePreference,
} from "@/lib/theme";

/**
 * Keeps <html data-theme> in step with the stored choice. The head script
 * sets it before the first paint; this puts it back when React resets the
 * <html> attributes (a dev remount) and follows a change made in another
 * tab.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyThemePreference(readThemePreference());

    return subscribeToThemePreference(() => {});
  }, []);

  return null;
}
