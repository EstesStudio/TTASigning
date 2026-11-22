import assert from "node:assert/strict";
import { test } from "node:test";
import { verificationErrorMessage } from "./signing-verification-messages.ts";
import { t } from "./i18n.ts";

test("verification failures use translated status messages and safe fallbacks", () => {
  for (const locale of ["en", "es"] as const) {
    assert.equal(
      verificationErrorMessage(locale, 429, "send", "email_code"),
      t(locale, "verify.tooMany"),
    );
    assert.equal(
      verificationErrorMessage(locale, 410, "check", "email_code"),
      t(locale, "error.codeExpired"),
    );
    assert.equal(
      verificationErrorMessage(locale, 400, "check", "access_code"),
      t(locale, "error.codeWrong"),
    );
    assert.equal(
      verificationErrorMessage(locale, 400, "check", "account"),
      t(locale, "verify.accountError"),
    );
    for (const status of [404, 409])
      assert.equal(
        verificationErrorMessage(locale, status, "check", "email_code"),
        t(locale, "verify.unavailable"),
      );
    assert.equal(
      verificationErrorMessage(locale, 500, "check", "access_code"),
      t(locale, "verify.checkError"),
    );
    assert.equal(
      verificationErrorMessage(locale, 503, "send", "email_code"),
      t(locale, "verify.sendError"),
    );
  }
});

for (const locale of ["en", "es"] as const) {
  test(
    locale +
      " account errors retain recovery instructions and attempt warnings",
    () => {
      for (const count of [1, 4])
        assert.equal(
          verificationErrorMessage(locale, 400, "check", "account", {
            code: "account_credentials_invalid",
            attemptsLeft: count,
          }),
          t(
            locale,
            count === 1
              ? "error.credentials.wrongOne"
              : "error.credentials.wrongMany",
            { count },
          ),
        );
      assert.equal(
        verificationErrorMessage(locale, 400, "check", "account", {
          code: "account_locked",
          maxAttempts: 5,
        }),
        t(locale, "error.credentials.locked", { attempts: 5 }),
      );
      assert.equal(
        verificationErrorMessage(locale, 400, "check", "account", {
          code: "account_identity_unconfirmed",
        }),
        t(locale, "error.credentials.identityNotConfirmed"),
      );
      for (const payload of [
        null,
        { code: "unknown", error: "raw server text" },
        {
          code: "account_credentials_invalid",
          attemptsLeft: "raw server text",
        },
        { code: "account_credentials_invalid", attemptsLeft: -1 },
      ])
        assert.equal(
          verificationErrorMessage(locale, 400, "check", "account", payload),
          t(locale, "verify.accountError"),
        );
      assert.equal(
        verificationErrorMessage(locale, 500, "check", "account", {
          code: "account_locked",
          maxAttempts: 5,
        }),
        t(locale, "verify.checkError"),
      );
    },
  );
}
