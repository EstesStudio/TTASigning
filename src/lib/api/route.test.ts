import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { registerHooks } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import type { Pool, QueryResult } from "pg";

import type * as MeRouteModule from "../../app/api/v1/me/route.ts";
import { generateApiKey, hashApiKey, type ApiKeyScope } from "../api-keys.ts";
import { replaceDbPoolForTests } from "../db/connection.ts";
import { sealWebhookSecret } from "../webhooks/endpoints.ts";
import { generateWebhookSecret, verifyWebhook } from "../webhooks/signing.ts";

const SRC_DIR = path.resolve(import.meta.dirname, "../..");
const V1_DIR = path.join(SRC_DIR, "app", "api", "v1");

// Resolve next/server and Next.js @/ path aliases when running plain node --test.
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

type StoredDelivery = {
  attempts: number;
  auditCreatedAt: number | null;
  auditEventId: string | null;
  auditMetadata: Record<string, unknown> | null;
  createdAt: number;
  deliveredAt: number | null;
  endpointEnabled: boolean;
  envelopeId: string | null;
  eventType: string;
  id: string;
  lastError: string | null;
  lastStatusCode: number | null;
  lockedUntil: number | null;
  nextAttemptAt: number | null;
  payload: string;
  secretEncrypted: string;
  signerId: string | null;
  status: "pending" | "delivered" | "failed";
  updatedAt: number;
  url: string;
};

type FakeDbOptions = {
  deliveries: StoredDelivery[];
  failKeyLookup?: boolean;
  key: {
    id: string;
    keyHash: string;
    name: string;
    scope: ApiKeyScope;
    userEmail: string;
    userId: string;
    userName: string;
  };
};

function createFakeDb(options: FakeDbOptions) {
  const rateLimits = new Map<string, { count: number; expiresAt: number }>();
  let dueChecks = 0;
  let lastUsedAt: number | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function queryResult<Row>(rows: Row[], rowCount = rows.length): QueryResult {
    return {
      command: "",
      fields: [],
      oid: 0,
      rowCount,
      rows,
    };
  }

  const pool = {
    async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (normalized.includes("FROM api_keys k")) {
        if (options.failKeyLookup) {
          throw new Error("Simulated database outage");
        }

        const [presentedHash] = params as [string, number];

        if (presentedHash !== options.key.keyHash) {
          return queryResult([]);
        }

        return queryResult([
          {
            email: options.key.userEmail,
            emailVerified: true,
            id: options.key.id,
            keyHash: options.key.keyHash,
            lastUsedAt,
            name: options.key.name,
            role: "admin",
            scope: options.key.scope,
            userId: options.key.userId,
            userName: options.key.userName,
          },
        ]);
      }

      if (normalized.startsWith("UPDATE api_keys SET last_used_at")) {
        lastUsedAt = params[0] as number;
        return queryResult([], 1);
      }

      if (normalized.startsWith("insert into public.rate_limits")) {
        const [key, now, windowMs] = params as [string, number, number];
        const existing = rateLimits.get(key);
        const next =
          existing && existing.expiresAt > now
            ? { count: existing.count + 1, expiresAt: existing.expiresAt }
            : { count: 1, expiresAt: now + windowMs };

        rateLimits.set(key, next);
        return queryResult([{ count: next.count, expires_at: next.expiresAt }]);
      }

      if (
        normalized.startsWith(
          "select count, expires_at from public.rate_limits",
        )
      ) {
        const [key, now] = params as [string, number];
        const existing = rateLimits.get(key);

        if (!existing || existing.expiresAt <= now) {
          return queryResult([]);
        }

        return queryResult([
          { count: existing.count, expires_at: existing.expiresAt },
        ]);
      }

      if (normalized.startsWith("delete from public.rate_limits")) {
        return queryResult([], 0);
      }

      if (
        normalized.startsWith("SELECT EXISTS") &&
        normalized.includes("FROM webhook_deliveries d")
      ) {
        const [now, maxAttempts] = params as [number, number];
        const due = options.deliveries.some(
          (delivery) =>
            delivery.status === "pending" &&
            delivery.nextAttemptAt !== null &&
            delivery.nextAttemptAt <= now &&
            (delivery.lockedUntil === null || delivery.lockedUntil <= now) &&
            delivery.attempts < maxAttempts &&
            delivery.endpointEnabled,
        );

        dueChecks += 1;
        notify();
        return queryResult([{ due }]);
      }

      if (
        normalized.startsWith("UPDATE webhook_deliveries") &&
        normalized.includes("The last try did not finish.")
      ) {
        return queryResult([], 0);
      }

      if (
        normalized.startsWith("WITH due AS") &&
        normalized.includes("FROM webhook_deliveries d")
      ) {
        const [now, limit, leaseSeconds, onlyId, maxAttempts] = params as [
          number,
          number,
          number,
          string | null,
          number,
        ];
        const claimed = options.deliveries
          .filter(
            (delivery) =>
              delivery.status === "pending" &&
              delivery.nextAttemptAt !== null &&
              delivery.nextAttemptAt <= now &&
              (delivery.lockedUntil === null || delivery.lockedUntil <= now) &&
              delivery.attempts < maxAttempts &&
              delivery.endpointEnabled &&
              (onlyId === null || delivery.id === onlyId),
          )
          .slice(0, limit);

        for (const delivery of claimed) {
          delivery.lockedUntil = now + leaseSeconds;
          delivery.attempts += 1;
          delivery.updatedAt = now;
        }

        notify();
        return queryResult(
          claimed.map((delivery) => ({
            attempts: delivery.attempts,
            auditCreatedAt: delivery.auditCreatedAt,
            auditEventId: delivery.auditEventId,
            auditMetadata: delivery.auditMetadata,
            createdAt: delivery.createdAt,
            envelopeId: delivery.envelopeId,
            eventType: delivery.eventType,
            id: delivery.id,
            lockedUntil: delivery.lockedUntil,
            payload: delivery.payload,
            previousSecretEncrypted: null,
            previousSecretExpiresAt: null,
            secretEncrypted: delivery.secretEncrypted,
            signerId: delivery.signerId,
            url: delivery.url,
          })),
        );
      }

      if (normalized === "SELECT id FROM envelopes WHERE id = $1") {
        return queryResult([{ id: params[0] as string }]);
      }

      if (
        normalized.startsWith("UPDATE webhook_deliveries") &&
        normalized.includes("SET status = 'delivered'")
      ) {
        const [id, now, statusCode, lockedUntil] = params as [
          string,
          number,
          number,
          number,
        ];
        const delivery = options.deliveries.find(
          (item) =>
            item.id === id &&
            item.lockedUntil === lockedUntil &&
            item.status === "pending",
        );

        if (delivery) {
          delivery.status = "delivered";
          delivery.deliveredAt = now;
          delivery.lastStatusCode = statusCode;
          delivery.lastError = null;
          delivery.lockedUntil = null;
          delivery.nextAttemptAt = null;
          delivery.updatedAt = now;
          notify();
        }

        return queryResult([], delivery ? 1 : 0);
      }

      if (
        normalized.startsWith("UPDATE webhook_deliveries") &&
        normalized.includes("SET status = $3, next_attempt_at = $4")
      ) {
        const [
          id,
          now,
          status,
          nextAttemptAt,
          statusCode,
          lastError,
          lockedUntil,
        ] = params as [
          string,
          number,
          "pending" | "failed",
          number | null,
          number | null,
          string,
          number,
        ];
        const delivery = options.deliveries.find(
          (item) =>
            item.id === id &&
            item.lockedUntil === lockedUntil &&
            item.status === "pending",
        );

        if (delivery) {
          delivery.status = status;
          delivery.nextAttemptAt = nextAttemptAt;
          delivery.lastStatusCode = statusCode;
          delivery.lastError = lastError;
          delivery.lockedUntil = null;
          delivery.updatedAt = now;
          notify();
        }

        return queryResult([], delivery ? 1 : 0);
      }

      throw new Error(`Unexpected query in fake DB: ${normalized}`);
    },
  } as unknown as Pool;

  async function waitFor(predicate: () => boolean, timeoutMs = 5000) {
    if (predicate()) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        listeners.delete(onUpdate);
        reject(new Error("Timed out waiting for webhook delivery state"));
      }, timeoutMs);

      function onUpdate() {
        if (predicate()) {
          clearTimeout(timer);
          listeners.delete(onUpdate);
          resolve();
        }
      }

      listeners.add(onUpdate);
    });
  }

  return {
    getDueChecks: () => dueChecks,
    pool,
    waitFor,
  };
}

async function listRouteFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(
        ...(await listRouteFiles(
          path.join(dir, entry.name),
          `${prefix}/${entry.name}`,
        )),
      );
    } else if (entry.name === "route.ts") {
      found.push(prefix);
    }
  }

  return found;
}

type ReceivedWebhook = { body: string; headers: IncomingHttpHeaders };

let meRoute: typeof MeRouteModule;
let replacedPool: Pool | null = null;
let server: Server;
let receiverUrl = "";
let receiverStatus = 204;
const received: ReceivedWebhook[] = [];
const previousEnv = new Map<string, string | undefined>();

before(async () => {
  for (const name of ["VERCEL", "WEBHOOK_ALLOW_PRIVATE_URLS"] as const) {
    previousEnv.set(name, process.env[name]);
  }

  delete process.env.VERCEL;
  process.env.WEBHOOK_ALLOW_PRIVATE_URLS = "1";

  server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
      });
      response.writeHead(receiverStatus);
      response.end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  receiverUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/webhook`;
  meRoute = await import("../../app/api/v1/me/route.ts");
});

after(async () => {
  if (replacedPool) {
    replaceDbPoolForTests(replacedPool);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));

  for (const [name, value] of previousEnv) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function makePendingRetry(
  overrides: Partial<StoredDelivery> & {
    nextAttemptAt: number;
    secret: string;
  },
): StoredDelivery {
  const now = Math.floor(Date.now() / 1000);
  const { secret, ...rest } = overrides;

  return {
    attempts: 1,
    auditCreatedAt: now - 120,
    auditEventId: "audit-1",
    auditMetadata: null,
    createdAt: now - 120,
    deliveredAt: null,
    endpointEnabled: true,
    envelopeId: "env-1",
    eventType: "envelope.sent",
    id: "msg_retrytest0001",
    lastError: "Answered 500",
    lastStatusCode: 500,
    lockedUntil: null,
    payload: JSON.stringify({
      data: { envelope: { id: "env-1", status: "sent" } },
      timestamp: new Date((now - 120) * 1000).toISOString(),
      type: "envelope.sent",
    }),
    secretEncrypted: sealWebhookSecret(secret),
    signerId: null,
    status: "pending",
    updatedAt: now - 120,
    url: receiverUrl,
    ...rest,
  };
}

test("every authenticated /api/v1 route runs through handleApi", async () => {
  const routes = await listRouteFiles(V1_DIR);
  const authenticated = routes.filter((route) => route !== "/openapi.json");

  assert.ok(authenticated.includes("/me"));

  for (const route of authenticated) {
    const source = await readFile(path.join(V1_DIR, route, "route.ts"), "utf8");

    assert.match(
      source,
      /\bhandleApi\(/,
      `${route}/route.ts should use handleApi so auth, rate limits and webhook retries stay consistent`,
    );
  }
});

test("authenticated GET /api/v1/me triggers delivery of a due webhook retry (issue #216)", async () => {
  received.length = 0;
  receiverStatus = 204;

  const secret = generateWebhookSecret();
  const readKey = generateApiKey();
  const now = Math.floor(Date.now() / 1000);
  const delivery = makePendingRetry({
    id: "msg_due_me_retry",
    nextAttemptAt: now - 1,
    secret,
  });
  const fakeDb = createFakeDb({
    deliveries: [delivery],
    key: {
      id: "key-read-1",
      keyHash: hashApiKey(readKey),
      name: "Read monitor",
      scope: "read",
      userEmail: "ops@example.test",
      userId: "user-1",
      userName: "Ops Admin",
    },
  });

  replacedPool = replaceDbPoolForTests(fakeDb.pool) ?? replacedPool;

  const response = await meRoute.GET(
    new Request("http://localhost:3000/api/v1/me", {
      headers: { authorization: `Bearer ${readKey}` },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("ratelimit-limit"), "600");
  assert.deepEqual(await response.json(), {
    key: { id: "key-read-1", name: "Read monitor", scope: "read" },
    user: { email: "ops@example.test", id: "user-1", name: "Ops Admin" },
  });

  await fakeDb.waitFor(() => delivery.status === "delivered");

  assert.equal(delivery.attempts, 2);
  assert.equal(delivery.lastStatusCode, 204);
  assert.equal(delivery.nextAttemptAt, null);
  assert.equal(received.length, 1);
  assert.equal(received[0]?.headers["webhook-id"], "msg_due_me_retry");
  assert.equal(
    verifyWebhook(secret, {
      body: received[0]?.body ?? "",
      id: String(received[0]?.headers["webhook-id"] ?? ""),
      signatureHeader: String(received[0]?.headers["webhook-signature"] ?? ""),
      timestamp: Number(received[0]?.headers["webhook-timestamp"] ?? 0),
    }),
    true,
  );
});

test("authenticated GET /api/v1/me leaves a future webhook retry pending (issue #216)", async () => {
  received.length = 0;
  receiverStatus = 204;

  const secret = generateWebhookSecret();
  const readKey = generateApiKey();
  const futureDueAt = Math.floor(Date.now() / 1000) + 300;
  const delivery = makePendingRetry({
    id: "msg_future_me_retry",
    nextAttemptAt: futureDueAt,
    secret,
  });
  const fakeDb = createFakeDb({
    deliveries: [delivery],
    key: {
      id: "key-read-2",
      keyHash: hashApiKey(readKey),
      name: "Read monitor",
      scope: "read",
      userEmail: "ops@example.test",
      userId: "user-1",
      userName: "Ops Admin",
    },
  });

  replacedPool = replaceDbPoolForTests(fakeDb.pool) ?? replacedPool;

  const response = await meRoute.GET(
    new Request("http://localhost:3000/api/v1/me", {
      headers: { authorization: `Bearer ${readKey}` },
    }),
  );

  assert.equal(response.status, 200);
  await fakeDb.waitFor(() => fakeDb.getDueChecks() === 1);
  await delay(50);

  assert.equal(delivery.status, "pending");
  assert.equal(delivery.attempts, 1);
  assert.equal(delivery.lastStatusCode, 500);
  assert.equal(delivery.nextAttemptAt, futureDueAt);
  assert.equal(received.length, 0);
});

test("unauthenticated GET /api/v1/me returns 401 and does not trigger due webhook retries", async () => {
  received.length = 0;
  receiverStatus = 204;

  const secret = generateWebhookSecret();
  const readKey = generateApiKey();
  const dueAt = Math.floor(Date.now() / 1000) - 5;
  const delivery = makePendingRetry({
    id: "msg_unauth_me_retry",
    nextAttemptAt: dueAt,
    secret,
  });
  const fakeDb = createFakeDb({
    deliveries: [delivery],
    key: {
      id: "key-read-3",
      keyHash: hashApiKey(readKey),
      name: "Read monitor",
      scope: "read",
      userEmail: "ops@example.test",
      userId: "user-1",
      userName: "Ops Admin",
    },
  });

  replacedPool = replaceDbPoolForTests(fakeDb.pool) ?? replacedPool;

  const response = await meRoute.GET(
    new Request("http://localhost:3000/api/v1/me"),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unauthorized",
      message: 'Send a valid API key as "Authorization: Bearer sdk_…".',
    },
  });

  await delay(50);

  assert.equal(fakeDb.getDueChecks(), 0);
  assert.equal(delivery.status, "pending");
  assert.equal(delivery.attempts, 1);
  assert.equal(received.length, 0);
});

test("GET /api/v1/me still answers in the API error shape when the database fails", async (t) => {
  const logged = t.mock.method(console, "error", () => undefined);
  const readKey = generateApiKey();
  const fakeDb = createFakeDb({
    deliveries: [],
    failKeyLookup: true,
    key: {
      id: "key-read-4",
      keyHash: hashApiKey(readKey),
      name: "Read monitor",
      scope: "read",
      userEmail: "ops@example.test",
      userId: "user-1",
      userName: "Ops Admin",
    },
  });

  replacedPool = replaceDbPoolForTests(fakeDb.pool) ?? replacedPool;

  const response = await meRoute.GET(
    new Request("http://localhost:3000/api/v1/me", {
      headers: { authorization: `Bearer ${readKey}` },
    }),
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: {
      code: "internal_error",
      message: "Something went wrong on the install. Try again later.",
    },
  });
  assert.ok(
    logged.mock.calls.some((call) =>
      String(call.arguments[0]).includes('"category":"api_me_failure"'),
    ),
    "expected api_me_failure security log entry",
  );
});
