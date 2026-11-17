// What a person is told about a password's length, the same on every form.
// The limits match Better Auth's minPasswordLength and maxPasswordLength in
// src/lib/auth/server.ts (15 to 128 characters).

import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.ts";

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
export const PASSWORD_TOO_LONG_MESSAGE = `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
export const PASSWORD_BREACHED_MESSAGE =
  "Choose a password that hasn't appeared in a breach";

type PasswordMessages = { breached: string; tooLong: string; tooShort: string };

const MESSAGES: Record<Locale, PasswordMessages> = {
  en: {
    breached: PASSWORD_BREACHED_MESSAGE,
    tooLong: PASSWORD_TOO_LONG_MESSAGE,
    tooShort: PASSWORD_TOO_SHORT_MESSAGE,
  },
  fr: {
    breached:
      "Choisissez un mot de passe qui n’est apparu dans aucune fuite de données",
    tooLong: `Le mot de passe doit comporter au plus ${PASSWORD_MAX_LENGTH} caractères`,
    tooShort: `Le mot de passe doit comporter au moins ${PASSWORD_MIN_LENGTH} caractères`,
  },
};

/** The length problem with a new password, or null when it fits. */
export function newPasswordLengthError(
  password: string,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return MESSAGES[locale].tooShort;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return MESSAGES[locale].tooLong;
  }

  return null;
}

/** The "too short" message in this language. */
export function passwordTooShortMessage(
  locale: Locale = DEFAULT_LOCALE,
): string {
  return MESSAGES[locale].tooShort;
}

/** True when a message is the "too long" one, in any language. */
export function isPasswordTooLongMessage(message: string | null): boolean {
  return Object.values(MESSAGES).some(({ tooLong }) => tooLong === message);
}

type AuthErrorLike = { code?: string | null; message?: string | null };

/**
 * The message for a password Better Auth refused, or null when the refusal
 * was not about the password itself. A password over the limit is answered
 * with PASSWORD_TOO_LONG / "Password too long", which used to end up as
 * "Something went wrong" (issue #57).
 */
export function describePasswordRefusal(
  error: AuthErrorLike | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  const code = error?.code ?? "";
  const message = error?.message?.trim().toLowerCase() ?? "";

  if (code === "PASSWORD_TOO_LONG" || message.includes("password too long")) {
    return MESSAGES[locale].tooLong;
  }

  if (code === "PASSWORD_TOO_SHORT" || message.includes("password too short")) {
    return MESSAGES[locale].tooShort;
  }

  if (message.includes("compromised")) {
    return MESSAGES[locale].breached;
  }

  return null;
}
