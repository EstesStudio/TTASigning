import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkGraphPermissions,
  combineGraphSettings,
  sealGraphSecret,
} from "./email-graph-settings.ts";
import { buildExchangeCommands } from "./exchange-commands.ts";
import type { GraphFetch } from "./services/email-graph.ts";
import {
  createEmailService,
  isEmailNotConnectedError,
} from "./services/email.ts";

// Microsoft 365 credentials entered in Settings, for EMAIL_DRIVER=graph.
// Nothing here reads a database or talks to Microsoft.

const SECRET_ENV = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  EMAIL_DRIVER: "graph",
};

const SENDER = { senderAddress: "sign@acme.test", senderAddressFromEnv: false };

function stored(env = SECRET_ENV) {
  return {
    clientId: "11111111-1111-1111-1111-111111111111",
    clientSecret: sealGraphSecret("stored-secret", env),
    tenantId: "acme.onmicrosoft.com",
  };
}

test("credentials saved in Settings make a complete configuration", () => {
  const graph = combineGraphSettings(stored(), SENDER, SECRET_ENV);

  assert.deepEqual(graph.missing, []);
  assert.equal(graph.config?.clientSecret, "stored-secret");
  assert.equal(graph.config?.tenantId, "acme.onmicrosoft.com");
  assert.equal(graph.config?.sender, "sign@acme.test");
  assert.equal(graph.values.clientSecretSet, true);
  assert.equal("clientSecret" in graph.values, false);
});

test("an environment variable wins over the stored value, field by field", () => {
  const env = {
    ...SECRET_ENV,
    MICROSOFT_GRAPH_CLIENT_SECRET: "env-secret",
    MICROSOFT_GRAPH_TENANT_ID: "22222222-2222-2222-2222-222222222222",
  };
  const graph = combineGraphSettings(stored(), SENDER, env);

  assert.equal(graph.config?.clientSecret, "env-secret");
  assert.equal(graph.config?.tenantId, "22222222-2222-2222-2222-222222222222");
  assert.equal(graph.config?.clientId, "11111111-1111-1111-1111-111111111111");
  assert.deepEqual(graph.fromEnv, {
    clientId: false,
    clientSecret: true,
    sender: false,
    tenantId: true,
  });
});

test("a secret sealed under another BETTER_AUTH_SECRET is reported, not used", () => {
  const graph = combineGraphSettings(stored(), SENDER, {
    ...SECRET_ENV,
    BETTER_AUTH_SECRET: "b".repeat(32),
  });

  assert.equal(graph.config, null);
  assert.equal(graph.secretUnreadable, true);
  assert.deepEqual(graph.missing, ["clientSecret"]);
});

test("nothing set anywhere names every missing field", () => {
  const graph = combineGraphSettings(
    { clientId: null, clientSecret: null, tenantId: null },
    { senderAddress: null, senderAddressFromEnv: false },
    SECRET_ENV,
  );

  assert.equal(graph.config, null);
  assert.deepEqual(graph.missing.sort(), [
    "clientId",
    "clientSecret",
    "sender",
    "tenantId",
  ]);
});

test("an unfinished setup fails the send as email not being connected", async () => {
  const service = createEmailService({
    env: SECRET_ENV,
    resolveGraph: async () =>
      combineGraphSettings(
        { ...stored(), clientSecret: null },
        SENDER,
        SECRET_ENV,
      ),
  });

  await assert.rejects(
    service.send({
      subject: "Hi",
      template: "test_email",
      textBody: "Hi",
      to: "someone@example.test",
    }),
    (error: unknown) => {
      assert.match(String(error), /MICROSOFT_GRAPH_CLIENT_SECRET/);
      assert.equal(isEmailNotConnectedError(error), true);

      return true;
    },
  );
});

function tokenWithRoles(roles: string[]): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${part({ alg: "none" })}.${part({ roles })}.signature`;
}

function tokenFetch(accessToken: string): GraphFetch {
  return async () => ({
    headers: { get: () => null },
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({ access_token: accessToken, expires_in: 3600 }),
  });
}

test("Verify connection warns when Mail.Send was granted for the whole tenant", async () => {
  const resolution = combineGraphSettings(stored(), SENDER, SECRET_ENV);
  const risky = await checkGraphPermissions({
    env: SECRET_ENV,
    fetch: tokenFetch(tokenWithRoles(["Mail.Send"])),
    resolution,
  });
  const scoped = await checkGraphPermissions({
    env: SECRET_ENV,
    fetch: tokenFetch(tokenWithRoles([])),
    resolution,
  });

  assert.deepEqual(risky, {
    roles: ["Mail.Send"],
    signedIn: true,
    tenantWideMailSend: true,
  });
  assert.deepEqual(scoped, {
    roles: [],
    signedIn: true,
    tenantWideMailSend: false,
  });
});

test("Verify connection reports a refused sign-in in Microsoft's words", async () => {
  const result = await checkGraphPermissions({
    env: SECRET_ENV,
    fetch: async () => ({
      headers: { get: () => null },
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: "invalid_client",
          error_description:
            "AADSTS7000215: Invalid client secret provided.\r\nTrace ID: x",
        }),
    }),
    resolution: combineGraphSettings(stored(), SENDER, SECRET_ENV),
  });

  assert.deepEqual(result, {
    message:
      "Microsoft sign-in failed: AADSTS7000215: Invalid client secret provided.",
    signedIn: false,
  });
});

test("the Exchange commands carry the entered IDs, quoted for PowerShell", () => {
  const commands = buildExchangeCommands({
    clientId: "11111111-1111-1111-1111-111111111111",
    sender: "o'neil$@acme.test",
  });

  assert.match(
    commands,
    /New-ManagementRoleAssignment -App '11111111-1111-1111-1111-111111111111' -Role "Application Mail.Send" -CustomResourceScope "SignuDoc sender"/,
  );
  assert.match(
    commands,
    /-RecipientRestrictionFilter "PrimarySmtpAddress -eq 'o''neil`\$@acme\.test'"/,
  );
  assert.match(
    commands,
    /Test-ServicePrincipalAuthorization -Identity '11111111-1111-1111-1111-111111111111' -Resource 'o''neil\$@acme\.test'/,
  );
});

test("the Exchange commands show placeholders before anything is entered", () => {
  const commands = buildExchangeCommands({ clientId: "", sender: "" });

  assert.match(commands, /-AppId <client-id>/);
  assert.match(commands, /'sign@yourcompany\.com'/);
});
