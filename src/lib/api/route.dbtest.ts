import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerHooks } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import type pg from "pg";

import type * as MeRouteModule from "../../app/api/v1/me/route.ts";
import { createApiKey } from "../api-keys.ts";
import { replaceDbPoolForTests } from "../db/connection.ts";
import { openTestDatabase } from "../db/test-database.ts";
import { ReminderMutationError } from "../reminders.ts";
import { createWebhookEndpoint } from "../webhooks/endpoints.ts";
import { claimIdempotencyKey, hashRequest } from "./idempotency.ts";
import type * as RouteModule from "./route.ts";

// The API's shared route code against a real Postgres. Run with
// `npm run test:db`.

const SRC_DIR = path.resolve(import.meta.dirname, "../..");

// The API's responses come from next/server, and app routes use @/ aliases,
// which Next.js resolves for itself. Plain Node needs the file names.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^next\/[a-z-]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }

    if (specifier.startsWith("@/")) {
      const target = path.join(SRC_DIR, specifier.slice(2));
      const resolved = existsSync(`${target}.ts`)
        ? `${target}.ts`
        : existsSync(`${target}.tsx`)
          ? `${target}.tsx`
          : path.join(target, "index.ts");

      return nextResolve(pathToFileURL(resolved).href, context);
    }

    return nextResolve(specifier, context);
  },
});

let database: pg.Pool | undefined;
let replaced: pg.Pool | null = null;
let route: typeof RouteModule;
let meRoute: typeof MeRouteModule;
const createdUsers: string[] = [];
const createdKeys: string[] = [];

/** The test database, once `before` has opened it. */
function db(): pg.Pool {
  assert.ok(database, "The test database did not open.");
  return database;
}

before(async () => {
  database = await openTestDatabase();
  replaced = replaceDbPoolForTests(database);
  route = await import("./route.ts");
  meRoute = await import("../../app/api/v1/me/route.ts");
});

after(async () => {
  // Nothing to clean up if the database never opened, and its own error
  // is the one that matters.
  if (!database) {
    return;
  }

  const pool = database;

  try {
    // api_idempotency has no foreign key to the key, so its rows go first.
    await pool.query(
      `delete from public.api_idempotency where api_key_id = any($1)`,
      [createdKeys],
    );
    await pool.query(`delete from public."user" where id = any($1)`, [
      createdUsers,
    ]);
  } finally {
    replaceDbPoolForTests(replaced ?? pool);
    await pool.end();
  }
});

async function createContext(idempotencyKey: string) {
  const id = randomUUID();
  const email = `${id}@example.test`;

  createdUsers.push(id);
  await db().query(
    `
      insert into public."user" (id, name, email, role, "emailVerified")
      values ($1, $2, $3, 'admin', true)
    `,
    [id, `Person ${id.slice(0, 4)}`, email],
  );

  const { summary } = await createApiKey(
    { email, userId: id },
    { expiresInDays: null, name: "Route test", scope: "write" },
    db(),
  );

  createdKeys.push(summary.id);

  return {
    actor: {
      apiKeyId: summary.id,
      email,
      ipAddress: null,
      name: "Route test",
      userAgent: null,
      userId: id,
    },
    apiKey: {
      id: summary.id,
      name: summary.name,
      scope: summary.scope,
    },
    rateLimit: { limit: 120, remaining: 119, resetSeconds: 60 },
    request: new Request("http://localhost:3000/api/v1/envelopes", {
      headers: { "idempotency-key": idempotencyKey },
      method: "POST",
    }),
  };
}

test("a request whose envelope could not be noted keeps its key, so a retry cannot make a second one", async () => {
  const key = `order-${randomUUID()}`;
  const context = await createContext(key);
  const body = '{"title":"Lease"}';

  await assert.rejects(
    route.runIdempotently(
      context,
      "POST /api/v1/envelopes",
      body,
      async (remember) => {
        // Postgres refuses a NUL in text, so noting the envelope fails the
        // way it would if the database went away right after the send.
        await remember("envelope\u0000id");

        return { body: {}, status: 201 };
      },
    ),
  );

  assert.deepEqual(
    await claimIdempotencyKey(
      {
        apiKeyId: context.actor.apiKeyId,
        key,
        requestHash: hashRequest("POST /api/v1/envelopes", body),
      },
      db(),
    ),
    { kind: "in_progress" },
  );
});

test(
  "a retry answering from the envelope does not replace the response the first request kept",
  {
    timeout: 10_000,
  },
  async () => {
    const key = `order-${randomUUID()}`;
    const context = await createContext(key);
    const body = '{"title":"Lease"}';
    let recoveryStarted!: () => void;
    const recovering = new Promise<void>((resolve) => {
      recoveryStarted = resolve;
    });
    let letRecoveryFinish!: () => void;
    const recoveryMayFinish = new Promise<void>((resolve) => {
      letRecoveryFinish = resolve;
    });
    let retry: Promise<Response> | undefined;
    let first: Response;

    try {
      first = await route.runIdempotently(
        context,
        "POST /api/v1/envelopes",
        body,
        async (remember) => {
          await remember("envelope-1");

          // A retry comes in now. The envelope is noted and no response is
          // kept yet, so it answers from the envelope, and finishes only
          // after this request has kept its own response.
          retry = route.runIdempotently(
            context,
            "POST /api/v1/envelopes",
            body,
            () =>
              Promise.reject(new Error("A retry must not make an envelope.")),
            async () => {
              recoveryStarted();
              await recoveryMayFinish;

              return { body: { from: "retry" }, status: 201 };
            },
          );

          // A retry that settles without answering from the envelope fails
          // the test now, with its own error, instead of at the timeout.
          const settledFirst = retry.then(() => {
            throw new Error(
              "The retry finished without answering from the envelope.",
            );
          });

          settledFirst.catch(() => undefined);
          await Promise.race([recovering, settledFirst]);

          return { body: { from: "first" }, status: 201 };
        },
      );
    } finally {
      letRecoveryFinish();
    }

    const second = await retry!;

    assert.equal(first.status, 201);
    assert.deepEqual(await first.json(), { from: "first" });
    assert.equal(second.status, 201);
    assert.equal(second.headers.get("idempotent-replayed"), "true");
    assert.deepEqual(await second.json(), { from: "first" });
    assert.deepEqual(
      await claimIdempotencyKey(
        {
          apiKeyId: context.actor.apiKeyId,
          key,
          requestHash: hashRequest("POST /api/v1/envelopes", body),
        },
        db(),
      ),
      { kind: "replay", response: { from: "first" }, statusCode: 201 },
    );
  },
);

test("a first request that finishes after a retry answered for it gives the answer the retry kept", async () => {
  const key = `order-${randomUUID()}`;
  const context = await createContext(key);
  const body = '{"title":"Lease"}';

  const first = await route.runIdempotently(
    context,
    "POST /api/v1/envelopes",
    body,
    async (remember) => {
      await remember("envelope-2");

      const retried = await route.runIdempotently(
        context,
        "POST /api/v1/envelopes",
        body,
        () => Promise.reject(new Error("A retry must not make an envelope.")),
        async () => ({ body: { from: "retry" }, status: 201 }),
      );

      assert.deepEqual(await retried.json(), { from: "retry" });

      return { body: { from: "first" }, status: 201 };
    },
  );

  assert.equal(first.status, 201);
  assert.equal(first.headers.get("idempotent-replayed"), null);
  assert.deepEqual(await first.json(), { from: "retry" });
});

test("a retry that finds the envelope gone does not replace what the first request answers", async () => {
  const key = `order-${randomUUID()}`;
  const context = await createContext(key);
  const body = '{"title":"Lease"}';

  const first = await route.runIdempotently(
    context,
    "POST /api/v1/envelopes",
    body,
    async (remember) => {
      await remember("envelope-3");

      // Someone deleted the envelope just now, so the retry finds nothing.
      const retried = await route.runIdempotently(
        context,
        "POST /api/v1/envelopes",
        body,
        () => Promise.reject(new Error("A retry must not make an envelope.")),
        async () => ({ body: { error: "gone" }, status: 404 }),
      );

      assert.equal(retried.status, 404);

      return { body: { from: "first" }, status: 201 };
    },
  );

  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), { from: "first" });
  assert.deepEqual(
    await claimIdempotencyKey(
      {
        apiKeyId: context.actor.apiKeyId,
        key,
        requestHash: hashRequest("POST /api/v1/envelopes", body),
      },
      db(),
    ),
    { kind: "replay", response: { from: "first" }, statusCode: 201 },
  );
});

test("a request that fails before making anything lets its key go", async () => {
  const key = `order-${randomUUID()}`;
  const context = await createContext(key);
  const body = '{"title":"Lease"}';

  await assert.rejects(
    route.runIdempotently(context, "POST /api/v1/envelopes", body, async () => {
      throw new Error("The install had a problem.");
    }),
  );

  const claim = await claimIdempotencyKey(
    {
      apiKeyId: context.actor.apiKeyId,
      key,
      requestHash: hashRequest("POST /api/v1/envelopes", body),
    },
    db(),
  );

  assert.equal(claim.kind, "new");
});

test("a reminder sent too soon says when the next one can go", async () => {
  const now = Math.floor(Date.now() / 1000);
  const response = route.apiErrorFor(
    new ReminderMutationError("You can send another reminder later.", 429, {
      nextAvailableAt: now + 3600,
      nextAvailableAtLabel: "later",
    }),
  );

  assert.equal(response?.status, 429);

  const wait = Number(response?.headers.get("retry-after"));

  assert.ok(wait > 3590 && wait <= 3600, `retry-after was ${String(wait)}`);
  assert.deepEqual(await response?.json(), {
    error: {
      code: "rate_limited",
      message: "You can send another reminder later.",
    },
  });
});

test("only refusals a retry would get again are kept for the key", () => {
  assert.equal(route.isKept(400), true);
  assert.equal(route.isKept(409), true);
  assert.equal(route.isKept(429), false);
  assert.equal(route.isKept(503), false);
});

test("the embed-link limit refuses in its own words, with Retry-After", async () => {
  const context = await createContext(`unused-${randomUUID()}`);
  const limit = {
    ...route.API_EMBED_LINK_LIMIT,
    key: `test-embed-link-${randomUUID()}`,
    limit: 1,
  };

  assert.equal(await route.applyAccountLimit(context, limit), null);

  const refused = await route.applyAccountLimit(context, limit);

  assert.equal(refused?.status, 429);
  assert.ok(Number(refused?.headers.get("retry-after")) > 0);
  assert.deepEqual(await refused?.json(), {
    error: {
      code: "rate_limited",
      message:
        "This key has asked for too many signing links for now. Wait and try again.",
    },
  });
});

test(
  "GET /api/v1/me delivers due webhook retries and leaves future retries pending",
  { timeout: 10_000 },
  async () => {
    const userId = randomUUID();
    const email = `${userId}@example.test`;
    const deliveryId = `msg_${randomUUID().replaceAll("-", "")}`;
    const hits: string[] = [];
    const receiver = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        hits.push(String(req.headers["webhook-id"] ?? ""));
        res.writeHead(204).end();
      });
    });
    const prevAllowPrivate = process.env.WEBHOOK_ALLOW_PRIVATE_URLS;
    const prevVercel = process.env.VERCEL;
    let endpointId: string | null = null;

    createdUsers.push(userId);
    delete process.env.VERCEL;
    process.env.WEBHOOK_ALLOW_PRIVATE_URLS = "1";

    try {
      await new Promise<void>((resolve, reject) => {
        receiver.once("error", reject);
        receiver.listen(0, "127.0.0.1", resolve);
      });

      await db().query(
        `
          insert into public."user" (id, name, email, role, "emailVerified")
          values ($1, 'Webhook Retry Admin', $2, 'admin', true)
        `,
        [userId, email],
      );

      const { key: readKey, summary } = await createApiKey(
        { email, userId },
        { expiresInDays: null, name: "Read check", scope: "read" },
        db(),
      );

      createdKeys.push(summary.id);

      const { port } = receiver.address() as AddressInfo;
      const { endpoint } = await createWebhookEndpoint(
        { email, userId },
        {
          description: "Retry receiver",
          events: ["envelope.sent"],
          url: `http://127.0.0.1:${String(port)}/webhook`,
        },
        { database: db(), env: process.env },
      );

      endpointId = endpoint.id;

      const now = Math.floor(Date.now() / 1000);
      const futureDueAt = now + 300;
      const payload = JSON.stringify({
        data: { envelope: { id: "env-retry", status: "sent" } },
        timestamp: new Date((now - 60) * 1000).toISOString(),
        type: "envelope.sent",
      });

      await db().query(
        `
          insert into public.webhook_deliveries (
            id, endpoint_id, event_type, payload, status, attempts,
            next_attempt_at, last_status_code, last_error, created_at, updated_at
          )
          values ($1, $2, 'envelope.sent', $3, 'pending', 1, $4, 500, 'Answered 500', $5, $5)
        `,
        [deliveryId, endpointId, payload, futureDueAt, now - 60],
      );

      const readDelivery = async () =>
        (
          await db().query<{
            attempts: number;
            last_status_code: number | null;
            next_attempt_at: number | null;
            status: string;
          }>(
            `
              select status, attempts, last_status_code, next_attempt_at
              from public.webhook_deliveries
              where id = $1
            `,
            [deliveryId],
          )
        ).rows[0];

      // Before next_attempt_at: GET /api/v1/me succeeds and leaves the retry pending.
      const beforeDue = await meRoute.GET(
        new Request("http://localhost:3000/api/v1/me", {
          headers: { authorization: `Bearer ${readKey}` },
        }),
      );

      assert.equal(beforeDue.status, 200);
      assert.deepEqual(await beforeDue.json(), {
        key: { id: summary.id, name: "Read check", scope: "read" },
        user: { email, id: userId, name: "Webhook Retry Admin" },
      });
      await delay(250);
      assert.deepEqual(await readDelivery(), {
        attempts: 1,
        last_status_code: 500,
        next_attempt_at: futureDueAt,
        status: "pending",
      });
      assert.deepEqual(hits, []);

      // Once due: unauthenticated /me returns 401 without triggering retries.
      await db().query(
        `update public.webhook_deliveries set next_attempt_at = $2 where id = $1`,
        [deliveryId, now - 1],
      );

      const unauthenticated = await meRoute.GET(
        new Request("http://localhost:3000/api/v1/me"),
      );

      assert.equal(unauthenticated.status, 401);
      await delay(250);
      assert.deepEqual(await readDelivery(), {
        attempts: 1,
        last_status_code: 500,
        next_attempt_at: now - 1,
        status: "pending",
      });
      assert.deepEqual(hits, []);

      // Authenticated GET /api/v1/me with a read key triggers delivery of the due retry.
      const whenDue = await meRoute.GET(
        new Request("http://localhost:3000/api/v1/me", {
          headers: { authorization: `Bearer ${readKey}` },
        }),
      );

      assert.equal(whenDue.status, 200);

      const deadline = Date.now() + 5000;
      let delivered = await readDelivery();

      while (delivered?.status !== "delivered" && Date.now() < deadline) {
        await delay(50);
        delivered = await readDelivery();
      }

      assert.deepEqual(delivered, {
        attempts: 2,
        last_status_code: 204,
        next_attempt_at: null,
        status: "delivered",
      });
      assert.deepEqual(hits, [deliveryId]);
    } finally {
      if (endpointId) {
        await db().query(`delete from public.webhook_endpoints where id = $1`, [
          endpointId,
        ]);
      }

      if (receiver.listening) {
        await new Promise<void>((resolve) => receiver.close(() => resolve()));
      }

      if (prevAllowPrivate === undefined) {
        delete process.env.WEBHOOK_ALLOW_PRIVATE_URLS;
      } else {
        process.env.WEBHOOK_ALLOW_PRIVATE_URLS = prevAllowPrivate;
      }

      if (prevVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = prevVercel;
      }
    }
  },
);
