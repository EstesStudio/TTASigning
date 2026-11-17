// The languages SignuDoc can speak to signers and in the email it sends.
//
// An install picks one under Settings, Organization. English is the default
// and the language every message is written in first; each other language
// must translate every message, which the type of its dictionary enforces.
// To add a language, add its code here and a dictionary next to each
// English one (the compiler lists what is missing).

export const LOCALES = ["en", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** What each language is called, in that language, for the Settings menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

/** A stored or submitted value as a language this install speaks. */
export function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

/** The BCP 47 tag dates and numbers are formatted with. */
export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}
