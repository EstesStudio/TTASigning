// Why a PDF could not be shown in the editor, in words a sender can act on.
// Kept apart from the upload page so it can be tested without a browser.

import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.ts";

export const LOCKED_PDF_MESSAGE =
  "This PDF is password-protected or encrypted. Please upload an unlocked PDF.";

export const PREVIEW_UNAVAILABLE_MESSAGE =
  "We couldn't render this PDF in the editor. Please export it as a standard PDF and try again.";

const MESSAGES: Record<Locale, { locked: string; unavailable: string }> = {
  en: { locked: LOCKED_PDF_MESSAGE, unavailable: PREVIEW_UNAVAILABLE_MESSAGE },
  fr: {
    locked:
      "Ce PDF est protégé par un mot de passe ou chiffré. Importez un PDF déverrouillé.",
    unavailable:
      "Impossible d’afficher ce PDF dans l’éditeur. Exportez-le en PDF standard, puis réessayez.",
  },
};

/** The render-failure message in this language. */
export function previewUnavailableMessage(
  locale: Locale = DEFAULT_LOCALE,
): string {
  return MESSAGES[locale].unavailable;
}

/**
 * PDF.js refuses a file that needs a password to open with a
 * PasswordException before anything is uploaded. That is the same refusal
 * the server gives an encrypted file, so it gets the same message, not the
 * render failure every other preview error gets (issue #54).
 */
export function describePdfPreviewFailure(
  error: unknown,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "PasswordException"
  ) {
    return MESSAGES[locale].locked;
  }

  return MESSAGES[locale].unavailable;
}
