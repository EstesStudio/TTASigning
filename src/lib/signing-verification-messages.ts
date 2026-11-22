import { t, type SignerLocale } from "./i18n.ts";

export type AccountVerificationFailure =
  | { code: "account_credentials_invalid"; attemptsLeft: number }
  | { code: "account_locked"; maxAttempts: number }
  | { code: "account_identity_unconfirmed" };

/** Stable codes retain recovery guidance; unrecognized failures never render server prose. */
export function verificationErrorMessage(
  locale: SignerLocale,
  status: number,
  action: "send" | "check",
  method: "account" | "access_code" | "email_code",
  payload?: unknown,
): string {
  if (status === 429) return t(locale, "verify.tooMany");
  if (status === 409 || status === 404) return t(locale, "verify.unavailable");
  if (status === 410)
    return t(
      locale,
      action === "check" && method === "email_code"
        ? "error.codeExpired"
        : "verify.unavailable",
    );
  if (
    action === "check" &&
    method === "account" &&
    (status === 400 || status === 401) &&
    payload &&
    typeof payload === "object"
  ) {
    const failure = payload as Record<string, unknown>;
    if (failure.code === "account_identity_unconfirmed")
      return t(locale, "error.credentials.identityNotConfirmed");
    if (
      failure.code === "account_locked" &&
      typeof failure.maxAttempts === "number" &&
      Number.isSafeInteger(failure.maxAttempts) &&
      failure.maxAttempts > 0
    )
      return t(locale, "error.credentials.locked", {
        attempts: failure.maxAttempts,
      });
    if (
      failure.code === "account_credentials_invalid" &&
      typeof failure.attemptsLeft === "number" &&
      Number.isSafeInteger(failure.attemptsLeft) &&
      failure.attemptsLeft > 0
    )
      return t(
        locale,
        failure.attemptsLeft === 1
          ? "error.credentials.wrongOne"
          : "error.credentials.wrongMany",
        { count: failure.attemptsLeft },
      );
  }
  if (action === "check" && (status === 400 || status === 401))
    return t(
      locale,
      method === "account" ? "verify.accountError" : "error.codeWrong",
    );
  return t(
    locale,
    action === "send" ? "verify.sendError" : "verify.checkError",
  );
}
