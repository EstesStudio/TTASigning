import assert from "node:assert/strict";
import { test } from "node:test";

import { readMicrosoftConfig } from "./microsoft.ts";
import { mayUsePassword, readPasswordSignInPolicy } from "./sso.ts";

const credentials = {
  MICROSOFT_CLIENT_ID: "client",
  MICROSOFT_CLIENT_SECRET: "secret",
};

function captureWarnings() {
  const warnings: string[] = [];
  const originalWarn = console.warn;

  console.warn = (message: unknown) => {
    warnings.push(String(message));
  };

  return {
    restore() {
      console.warn = originalWarn;
    },
    warnings,
  };
}

test("a missing half is reported once and treated as off", () => {
  // First in the file: the warning is deduplicated per message for the
  // life of the process, so it must still be pending when this runs.
  const warn = captureWarnings();

  try {
    assert.equal(readMicrosoftConfig({ MICROSOFT_CLIENT_ID: "client" }), null);
    assert.equal(warn.warnings.length, 1);
    assert.match(
      warn.warnings[0] ?? "",
      /set both MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET/,
    );
  } finally {
    warn.restore();
  }
});

test("Microsoft sign-in is off unless both settings are given", () => {
  assert.equal(readMicrosoftConfig({}), null);
  assert.equal(
    readMicrosoftConfig({ ...credentials, MICROSOFT_CLIENT_SECRET: "" }),
    null,
  );
  assert.equal(
    readMicrosoftConfig({ MICROSOFT_CLIENT_SECRET: "secret" }),
    null,
  );
});

test("the tenant defaults to common and may be named or a directory GUID", () => {
  assert.deepEqual(readMicrosoftConfig(credentials), {
    clientId: "client",
    clientSecret: "secret",
    tenantId: "common",
    discoveryUrl:
      "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
  });

  for (const tenantId of [
    "organizations",
    "consumers",
    "9188f0b2-2c51-4f46-a1da-9b96f1c0e17a",
  ]) {
    const config = readMicrosoftConfig({
      ...credentials,
      MICROSOFT_TENANT_ID: ` ${tenantId} `,
    });

    assert.equal(config?.tenantId, tenantId);
    assert.equal(
      config?.discoveryUrl,
      `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
    );
  }
});

test("a tenant that is neither an alias nor a GUID turns Microsoft sign-in off", () => {
  // The tenant warning has its own message, so it is still pending here.
  const warn = captureWarnings();

  try {
    assert.equal(
      readMicrosoftConfig({ ...credentials, MICROSOFT_TENANT_ID: "my tenant" }),
      null,
    );
    assert.equal(warn.warnings.length, 1);
    assert.match(warn.warnings[0] ?? "", /MICROSOFT_TENANT_ID/);
  } finally {
    warn.restore();
  }
});

test("password sign-in can also be turned off with Microsoft alone", () => {
  assert.equal(
    readPasswordSignInPolicy({ PASSWORD_SIGN_IN: "off" }).enabled,
    true,
  );

  const policy = readPasswordSignInPolicy({
    ...credentials,
    PASSWORD_SIGN_IN: "OFF",
    PASSWORD_SIGN_IN_ALLOWED_EMAILS: " Admin@Acme.com ",
  });

  assert.equal(policy.enabled, false);
  assert.deepEqual(policy.allowedEmails, ["admin@acme.com"]);
  assert.equal(mayUsePassword(policy, "ADMIN@acme.com"), true);
  assert.equal(mayUsePassword(policy, "pat@acme.com"), false);
});
