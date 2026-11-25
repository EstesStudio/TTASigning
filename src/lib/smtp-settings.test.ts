import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applySmtpSettingsUpdate,
  NO_STORED_SMTP_SETTINGS,
  parseSmtpSettingsUpdate,
  SmtpSettingsError,
  smtpEnvFor,
  toSmtpSettingsView,
} from "./smtp-settings.ts";

const env = { BETTER_AUTH_SECRET: "a".repeat(64) };

function saved(password = "hunter2-smtp") {
  return applySmtpSettingsUpdate(
    NO_STORED_SMTP_SETTINGS,
    {
      host: "smtp.acme.com",
      password,
      port: 587,
      secure: null,
      user: "sign@acme.com",
    },
    env,
  ).next;
}

test("saved SMTP settings are sent with, and each variable set in the environment wins", () => {
  const stored = saved();

  assert.deepEqual(pickSmtp(smtpEnvFor(env, stored)), {
    SMTP_HOST: "smtp.acme.com",
    SMTP_PASSWORD: "hunter2-smtp",
    SMTP_PORT: "587",
    SMTP_SECURE: undefined,
    SMTP_USER: "sign@acme.com",
  });
  assert.deepEqual(
    pickSmtp(
      smtpEnvFor(
        { ...env, SMTP_HOST: "relay.acme.com", SMTP_PORT: " " },
        stored,
      ),
    ),
    {
      SMTP_HOST: "relay.acme.com",
      SMTP_PASSWORD: "hunter2-smtp",
      // Blank in the environment counts as not set.
      SMTP_PORT: "587",
      SMTP_SECURE: undefined,
      SMTP_USER: "sign@acme.com",
    },
  );
});

test("the saved password is sealed, and never shown on the page", () => {
  const stored = saved();
  const view = toSmtpSettingsView(env, stored);

  assert.ok(stored.sealedPassword);
  assert.ok(!stored.sealedPassword.includes("hunter2-smtp"));
  assert.equal(view.password, "saved");
  assert.ok(!JSON.stringify(view).includes("hunter2-smtp"));
  assert.ok(!JSON.stringify(view).includes(stored.sealedPassword));
});

test("after BETTER_AUTH_SECRET changes, the saved password has to be entered again", () => {
  const stored = saved();
  const rotated = { BETTER_AUTH_SECRET: "b".repeat(64) };

  assert.equal(toSmtpSettingsView(rotated, stored).password, "unreadable");
  assert.equal(smtpEnvFor(rotated, stored).SMTP_PASSWORD, undefined);
});

test("the page shows which fields the environment sets", () => {
  const view = toSmtpSettingsView({ ...env, SMTP_SECURE: "true" }, saved());

  assert.deepEqual(view.fromEnv, {
    host: false,
    password: false,
    port: false,
    secure: true,
    user: false,
  });
  assert.equal(view.secure, true);
  assert.equal(view.password, "saved");
  assert.ok(!JSON.stringify(view).includes("hunter2-smtp"));
});

test("a change to a field the environment sets is ignored", () => {
  assert.deepEqual(
    parseSmtpSettingsUpdate(
      { host: "smtp.other.com", port: 2525 },
      { SMTP_HOST: "smtp.acme.com" },
    ),
    { port: 2525 },
  );
});

test("a bad host or port is refused with a message for that field", () => {
  assert.throws(
    () => parseSmtpSettingsUpdate({ host: "smtp.acme.com:587", port: 0 }, {}),
    (error: unknown) =>
      error instanceof SmtpSettingsError &&
      Object.keys(error.fieldErrors).sort().join() === "host,port",
  );
  assert.deepEqual(parseSmtpSettingsUpdate({ host: "  ", user: "" }, {}), {
    host: null,
    user: null,
  });
  assert.deepEqual(parseSmtpSettingsUpdate({ host: "192.0.2.10" }, {}), {
    host: "192.0.2.10",
  });
});

test("the audit trail names what changed, and never the password", () => {
  const stored = saved();
  const { changes } = applySmtpSettingsUpdate(
    stored,
    { password: "new-secret-smtp", port: 465 },
    env,
  );

  assert.deepEqual(changes, {
    smtpPassword: { from: "saved", to: "replaced" },
    smtpPort: { from: 587, to: 465 },
  });
  assert.ok(!JSON.stringify(changes).includes("new-secret-smtp"));

  // Typing the same password again is not a change.
  assert.deepEqual(
    applySmtpSettingsUpdate(stored, { password: "hunter2-smtp" }, env).changes,
    {},
  );
});

function pickSmtp(source: Readonly<Record<string, string | undefined>>) {
  return {
    SMTP_HOST: source.SMTP_HOST,
    SMTP_PASSWORD: source.SMTP_PASSWORD,
    SMTP_PORT: source.SMTP_PORT,
    SMTP_SECURE: source.SMTP_SECURE,
    SMTP_USER: source.SMTP_USER,
  };
}

test("a saved password is only sent to the server it was saved for", () => {
  const stored = saved();

  assert.throws(
    () => applySmtpSettingsUpdate(stored, { host: "smtp.elsewhere.test" }, env),
    (error: unknown) =>
      error instanceof SmtpSettingsError &&
      typeof error.fieldErrors.password === "string",
  );
  assert.throws(
    () => applySmtpSettingsUpdate(stored, { user: "other@acme.com" }, env),
    SmtpSettingsError,
  );

  for (const change of [{ host: null }, { port: 2525 }, { secure: true }]) {
    assert.throws(
      () => applySmtpSettingsUpdate(stored, change, env),
      SmtpSettingsError,
    );
  }

  assert.throws(
    () =>
      parseSmtpSettingsUpdate(
        { host: "smtp.elsewhere.test", password: "" },
        env,
      ),
    SmtpSettingsError,
  );

  const moved = applySmtpSettingsUpdate(
    stored,
    { host: "smtp.elsewhere.test", password: "hunter2-smtp" },
    env,
  ).next;

  assert.equal(smtpEnvFor(env, moved).SMTP_HOST, "smtp.elsewhere.test");
});

test("a password from the environment is never sent to a server saved in the app", () => {
  const stored = saved();
  const withEnvPassword = { ...env, SMTP_PASSWORD: "from-the-environment" };
  const merged = smtpEnvFor(withEnvPassword, stored);

  assert.equal(merged.SMTP_PASSWORD, "from-the-environment");
  assert.equal(merged.SMTP_HOST, undefined);
  assert.equal(merged.SMTP_USER, undefined);
  assert.deepEqual(toSmtpSettingsView(withEnvPassword, stored).fromEnv, {
    host: true,
    password: true,
    port: true,
    secure: true,
    user: true,
  });
  assert.deepEqual(
    parseSmtpSettingsUpdate(
      { host: "smtp.elsewhere.test", user: "x@acme.com" },
      withEnvPassword,
    ),
    {},
  );
});
