import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import type pg from "pg";

import { openTestDatabase } from "./db/test-database.ts";
import {
  clearGraphSettings,
  GraphSettingsError,
  readStoredGraphSettings,
  resolveGraphConfig,
  saveGraphSettings,
} from "./email-graph-settings.ts";
import { invalidateSettingsCache } from "./settings.ts";

// Microsoft 365 credentials saved in Settings against a real Postgres: the
// secret is stored sealed, a save clears the "email works" mark, and
// variables keep winning. Run with `npm run test:db`.

const ENV = {
  BETTER_AUTH_SECRET: "c".repeat(32),
  EMAIL_DRIVER: "graph",
};

const INPUT = {
  clientId: "11111111-1111-1111-1111-111111111111",
  clientSecret: "the-secret",
  sender: "Sign@Acme.test",
  tenantId: "acme.onmicrosoft.com",
};

let database: pg.Pool;
let rowBefore: Record<string, unknown> | null = null;

before(async () => {
  database = await openTestDatabase();
  globalThis.__signudocPgPool = database;

  // One settings row for the whole database: put back what was there.
  const existing = await database.query(
    `select sender_address, email_ready_at, graph_tenant_id, graph_client_id,
            graph_client_secret
     from public.app_settings where id`,
  );

  rowBefore = existing.rows[0] ?? null;

  if (!rowBefore) {
    await database.query(
      `insert into public.app_settings (id, signup_mode, created_at, updated_at)
       values (true, 'closed', 0, 0)`,
    );
  }
});

beforeEach(async () => {
  await database.query(
    `update public.app_settings
     set sender_address = null, email_ready_at = 123, graph_tenant_id = null,
         graph_client_id = null, graph_client_secret = null
     where id`,
  );
  invalidateSettingsCache();
});

after(async () => {
  if (rowBefore) {
    await database.query(
      `update public.app_settings
       set sender_address = $1, email_ready_at = $2, graph_tenant_id = $3,
           graph_client_id = $4, graph_client_secret = $5
       where id`,
      [
        rowBefore.sender_address,
        rowBefore.email_ready_at,
        rowBefore.graph_tenant_id,
        rowBefore.graph_client_id,
        rowBefore.graph_client_secret,
      ],
    );
  } else {
    await database.query("delete from public.app_settings where id");
  }

  invalidateSettingsCache();
  await database.end();
});

test("saved credentials are used, with the secret stored sealed", async () => {
  const changes = await saveGraphSettings(INPUT, { database, env: ENV });
  const stored = await readStoredGraphSettings(database);
  const row = await database.query<{
    email_ready_at: number | null;
    sender_address: string | null;
  }>("select email_ready_at, sender_address from public.app_settings where id");

  assert.notEqual(stored.clientSecret, "the-secret");
  assert.match(stored.clientSecret ?? "", /^v1\./);
  assert.equal(row.rows[0]?.sender_address, "sign@acme.test");
  // Earned with other credentials, so no longer proof.
  assert.equal(row.rows[0]?.email_ready_at, null);
  // The audit record never carries the secret.
  assert.deepEqual(changes.microsoftClientSecret, {
    from: null,
    to: "replaced",
  });
  assert.equal(JSON.stringify(changes).includes("the-secret"), false);

  const graph = await resolveGraphConfig(ENV, database);

  assert.equal(graph.config?.clientSecret, "the-secret");
  assert.equal(graph.config?.sender, "sign@acme.test");
});

test("a blank secret keeps the saved one", async () => {
  await saveGraphSettings(INPUT, { database, env: ENV });
  const sealed = (await readStoredGraphSettings(database)).clientSecret;

  const changes = await saveGraphSettings(
    {
      ...INPUT,
      clientSecret: "",
      tenantId: "22222222-2222-2222-2222-222222222222",
    },
    { database, env: ENV },
  );

  assert.equal((await readStoredGraphSettings(database)).clientSecret, sealed);
  assert.equal(changes.microsoftClientSecret, undefined);
  assert.deepEqual(changes.microsoftTenantId, {
    from: "acme.onmicrosoft.com",
    to: "22222222-2222-2222-2222-222222222222",
  });
});

test("the first save needs every field, and checks their shape", async () => {
  await assert.rejects(
    saveGraphSettings(
      { ...INPUT, clientId: "not-a-guid", clientSecret: "" },
      { database, env: ENV },
    ),
    (error: unknown) => {
      assert.ok(error instanceof GraphSettingsError);
      assert.ok(error.fieldErrors.clientId);

      return true;
    },
  );

  await assert.rejects(
    saveGraphSettings({ ...INPUT, clientSecret: "" }, { database, env: ENV }),
    (error: unknown) =>
      error instanceof GraphSettingsError &&
      error.fieldErrors.clientSecret !== undefined,
  );
});

test("a field set by a variable is not saved, and wins", async () => {
  const env = { ...ENV, MICROSOFT_GRAPH_CLIENT_ID: "env-client" };

  await saveGraphSettings(
    { ...INPUT, clientId: "33333333-3333-3333-3333-333333333333" },
    { database, env },
  );

  assert.equal((await readStoredGraphSettings(database)).clientId, null);

  const graph = await resolveGraphConfig(env, database);

  assert.equal(graph.config?.clientId, "env-client");
  assert.equal(graph.fromEnv.clientId, true);
});

test("removing the credentials leaves the sender address", async () => {
  await saveGraphSettings(INPUT, { database, env: ENV });
  await clearGraphSettings(database);

  const stored = await readStoredGraphSettings(database);
  const graph = await resolveGraphConfig(ENV, database);

  assert.deepEqual(stored, {
    clientId: null,
    clientSecret: null,
    tenantId: null,
  });
  assert.equal(graph.values.sender, "sign@acme.test");
  assert.deepEqual(graph.missing.sort(), [
    "clientId",
    "clientSecret",
    "tenantId",
  ]);
});
