import { intlLocales, type Locale } from "./i18n/types.ts";

/** The single effective date shared by the hosted legal pages. */
export const TERMS_EFFECTIVE_DATE = "2026-03-21";

/**
 * Formats an ISO date for a legal page in the active language, always in UTC
 * so a reader in any timezone sees the same day.
 */
export function formatLegalDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
