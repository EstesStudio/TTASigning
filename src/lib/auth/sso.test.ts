import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isSsoEmailVerified,
  mayUsePassword,
  readPasswordSignInPolicy,
  readSsoConfig,
} from "./sso.ts";
import { describeSsoError } from "./sso-errors.ts";

const sso = {
  SSO_CLIENT_ID: "client",
  SSO_CLIENT_SECRET: "secret",
  SSO_ISSUER: "https://acme.okta.com/",
};

test("single sign-on is off unless all three settings are given", () => {
  assert.equal(readSsoConfig({}), null);
  assert.equal(readSsoConfig({ ...sso, SSO_CLIENT_SECRET: "" }), null);
  assert.equal(
    readSsoConfig({ ...sso, SSO_ISSUER: "http://acme.okta.com" }),
    null,
  );
  assert.equal(readSsoConfig({ ...sso, SSO_ISSUER: "not a url" }), null);
});

test("the issuer may be given with its discovery path or a trailing slash", () => {
  for (const issuer of [
    "https://acme.okta.com",
    "https://acme.okta.com/",
    "https://acme.okta.com/.well-known/openid-configuration",
  ]) {
    const config = readSsoConfig({ ...sso, SSO_ISSUER: issuer });

    assert.equal(config?.issuer, "https://acme.okta.com");
    assert.equal(
      config?.discoveryUrl,
      "https://acme.okta.com/.well-known/openid-configuration",
    );
  }

  assert.equal(readSsoConfig(sso)?.name, "single sign-on");
  assert.equal(readSsoConfig({ ...sso, SSO_NAME: "Okta" })?.name, "Okta");
});

test("password sign-in can only be turned off while single sign-on is set up", () => {
  assert.equal(
    readPasswordSignInPolicy({ PASSWORD_SIGN_IN: "off" }).enabled,
    true,
  );

  const policy = readPasswordSignInPolicy({
    ...sso,
    PASSWORD_SIGN_IN: "OFF",
    PASSWORD_SIGN_IN_ALLOWED_EMAILS: " Admin@Acme.com , ops@acme.com,",
  });

  assert.equal(policy.enabled, false);
  assert.deepEqual(policy.allowedEmails, ["admin@acme.com", "ops@acme.com"]);
  assert.equal(mayUsePassword(policy, "ADMIN@acme.com "), true);
  assert.equal(mayUsePassword(policy, "pat@acme.com"), false);
  assert.equal(
    mayUsePassword(readPasswordSignInPolicy(sso), "pat@acme.com"),
    true,
  );
});

test("isSsoEmailVerified accepts only explicit email_verified or Entra xms_edov affirmations", () => {
  assert.equal(isSsoEmailVerified({ email_verified: true }), true);
  assert.equal(isSsoEmailVerified({ email_verified: "true" }), true);
  assert.equal(isSsoEmailVerified({ xms_edov: true }), true);
  assert.equal(isSsoEmailVerified({ xms_edov: "true" }), true);
  assert.equal(isSsoEmailVerified({ xms_edov: 1 }), true);
  assert.equal(isSsoEmailVerified({ email_verified: false }), false);
  assert.equal(isSsoEmailVerified({ email_verified: "yes" }), false);
  assert.equal(isSsoEmailVerified({}), false);
});

test("describeSsoError explains pending local email confirmation for account_not_linked (#244)", () => {
  for (const code of [
    "account_not_linked",
    "unable_to_link_account",
    "email_not_verified",
  ]) {
    const withPasswordsOn = describeSsoError(code);

    assert.notEqual(
      withPasswordsOn,
      "Single sign-on did not finish. Please try again.",
    );
    assert.match(withPasswordsOn, /email address must be confirmed/i);
    assert.match(withPasswordsOn, /verification email/i);
    assert.match(
      withPasswordsOn,
      /log in with your password to send a fresh link/i,
    );
    assert.equal(
      describeSsoError(code, { passwordSignIn: "on" }),
      withPasswordsOn,
    );

    for (const passwordSignIn of ["off", "fallback"] as const) {
      const withoutPasswords = describeSsoError(code, { passwordSignIn });

      assert.match(withoutPasswords, /email address must be confirmed/i);
      assert.match(withoutPasswords, /verification email/i);
      assert.doesNotMatch(withoutPasswords, /log in with your password/i);
    }
  }
});

test("describeSsoError keeps cancellation, policy, and fallback messages accurate", () => {
  assert.equal(describeSsoError("access_denied"), "Sign-in was cancelled.");
  assert.match(
    describeSsoError("signup_closed"),
    /sign-up rule does not let it make one/,
  );
  assert.match(
    describeSsoError("signup_domain_not_allowed"),
    /sign-up rule does not let it make one/,
  );
  assert.match(
    describeSsoError("email_not_found"),
    /did not share an email address/,
  );
  assert.match(
    describeSsoError("account_already_linked_to_different_user"),
    /already tied to a different account/,
  );
  assert.equal(
    describeSsoError("unknown_error"),
    "Single sign-on did not finish. Please try again.",
  );
  assert.equal(
    describeSsoError(""),
    "Single sign-on did not finish. Please try again.",
  );
});
