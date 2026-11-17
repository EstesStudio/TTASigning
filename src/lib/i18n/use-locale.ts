"use client";

import { useBranding } from "@/components/layout/branding-provider";

import type { Locale } from "./locales.ts";

/**
 * The language this install speaks, for client components below a
 * BrandingProvider. Each area's dictionary module offers its own hook on
 * top of this one (see use-signing-messages.ts).
 */
export function useLocale(): Locale {
  return useBranding().locale;
}
