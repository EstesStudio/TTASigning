import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

import { afterStatement, openTestDatabase } from "./db/test-database.ts";
import { ELECTRONIC_RECORDS_DISCLOSURE_VERSION } from "./electronic-records-disclosure.ts";
import { runEnvelopeSchedule } from "./envelope-schedule.ts";
import { changeEnvelopeDeadline, voidSentEnvelope } from "./envelopes.ts";
import { issueSigningLink } from "./services/signing-links.ts";
import {
  createStorageService,
  type StorageService,
} from "./services/storage.ts";
import type {
  EmailService,
  TransactionalEmailMessage,
} from "./services/email.ts";
import {
  declineSigningForToken,
  recordSignerConsent,
  submitSigningForToken,
} from "./signing.ts";
import {
  attemptWebhookDeliveries,
  createWebhookEndpoint,
  enqueueEnvelopeWebhookEvent,
  expireWebhookDeliveryPayloads,
  listWebhookEndpoints,
  MAX_WEBHOOK_ATTEMPTS,
  retryDueWebhookDeliveries,
  retryWebhookDelivery,
  sendTestWebhookEvent,
  updateWebhookEndpoint,
  WEBHOOK_PAYLOAD_RETENTION_DAYS,
  webhookRetryDelaySeconds,
  webhookSignatureMatches,
  WebhooksError,
  type WebhookActor,
} from "./webhooks.ts";

// Webhook enqueue, delivery and retry against a real Postgres and a local
// HTTP receiver. Run with `npm run test:db`.

process.env.APP_URL ??= "https://sign.example.test";

const DAY = 24 * 60 * 60;
const DRAWN_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let database: pg.Pool;
const createdUsers: string[] = [];
const actor: WebhookActor = {
  email: "ada@example.test",
  userId: "admin-tests",
};

before(async () => {
  database = await openTestDatabase();
  globalThis.__signudocPgPool = database;
});

beforeEach(async () => {
  await database.query(`delete from webhook_endpoints`);
});

after(async () => {
  await database.query(`delete from webhook_endpoints`);
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
});

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

type ReceivedWebhook = {
  body: string;
  headers: IncomingMessage["headers"];
};

async function listen(
  status: number | (() => number) = 200,
  { delayMs = 0 }: { delayMs?: number } = {},
): Promise<{
  close: () => Promise<void>;
  received: ReceivedWebhook[];
  url: string;
}> {
  const received: ReceivedWebhook[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      received.push({
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
      });
      const reply = () => {
        response.statusCode = typeof status === "function" ? status() : status;
        response.end("ok");
      };

      if (delayMs > 0) {
        setTimeout(reply, delayMs);
      } else {
        reply();
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("The test receiver did not bind a port.");
  }

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    received,
    url: `http://127.0.0.1:${String(address.port)}/hooks`,
  };
}

async function createUser() {
  const id = randomUUID();

  createdUsers.push(id);
  await database.query(
    `insert into public."user" (id, name, email, role) values ($1, 'Sam Sender', $2, 'user')`,
    [id, `${id}@example.test`],
  );

  return id;
}

async function createSentEnvelope({ expiresAt }: { expiresAt: number | null }) {
  const userId = await createUser();
  const envelopeId = randomUUID();
  const signerId = randomUUID();
  const sentAt = unixNow() - 40 * DAY;
  const link = await issueSigningLink({
    expiresInSeconds: 60,
    issuedAt: sentAt,
  });

  await database.query(
    `
      insert into envelopes (
        id, user_id, title, status, source_pdf_key, source_pdf_filename,
        source_pdf_size_bytes, page_count, source_pdf_hash, sent_at, expires_at
      ) values ($1, $2, 'Lease', 'sent', $3, 'lease.pdf', 10, 1, $4, $5, $6)
    `,
    [
      envelopeId,
      userId,
      `test/${envelopeId}.pdf`,
      "a".repeat(64),
      sentAt,
      expiresAt,
    ],
  );
  await database.query(
    `
      insert into signers (
        id, envelope_id, name, email, sign_order, status,
        signing_token_hash, signing_token_expires_at, last_notified_at
      ) values ($1, $2, 'Riley Recipient', $3, 1, 'notified', $4, $5, $6)
    `,
    [
      signerId,
      envelopeId,
      `${signerId}@example.test`,
      link.tokenHash,
      link.exp,
      sentAt,
    ],
  );

  return { envelopeId, signerId, token: link.token, userId };
}

async function createSignableEnvelope() {
  const now = unixNow();
  const sent = await createSentEnvelope({ expiresAt: now + DAY });
  const fieldId = randomUUID();
  const storageDir = await mkdtemp(path.join(tmpdir(), "signudoc-webhooks-"));
  const storageService = createStorageService({
    env: { STORAGE_DRIVER: "local", STORAGE_LOCAL_DIR: storageDir },
  });
  const sourcePdf = await PDFDocument.create();

  sourcePdf.addPage([612, 792]);

  const sourcePdfBytes = await sourcePdf.save();

  await storageService.putObject({
    body: sourcePdfBytes,
    contentType: "application/pdf",
    key: `test/${sent.envelopeId}.pdf`,
  });
  await database.query(
    `
      update envelopes
      set source_pdf_hash = $1, source_pdf_size_bytes = $2
      where id = $3
    `,
    [
      createHash("sha256").update(sourcePdfBytes).digest("hex"),
      sourcePdfBytes.length,
      sent.envelopeId,
    ],
  );
  await database.query(
    `update signers set signing_token_expires_at = $1 where id = $2`,
    [now + DAY, sent.signerId],
  );
  await database.query(
    `
      insert into envelope_pages (id, envelope_id, page_number, width_pt, height_pt)
      values ($1, $2, 1, 612, 792)
    `,
    [randomUUID(), sent.envelopeId],
  );
  await database.query(
    `
      insert into fields (
        id, envelope_id, signer_id, type, page, x, y, width, height
      ) values ($1, $2, $3, 'signature', 1, 0.1, 0.1, 0.2, 0.1)
    `,
    [fieldId, sent.envelopeId, sent.signerId],
  );
  await recordSignerConsent(
    sent.token,
    { disclosureVersion: ELECTRONIC_RECORDS_DISCLOSURE_VERSION },
    { database },
  );

  return { ...sent, fieldId, storageDir, storageService };
}

function recordingEmailService() {
  const sent: TransactionalEmailMessage[] = [];
  const service: EmailService = {
    async send(message) {
      sent.push(message);
      return { accepted: [message.to], messageId: "m-1", rejected: [] };
    },
    async sendBatch() {
      throw new Error("not used");
    },
  };

  return { sent, service };
}

async function deliveriesFor(envelopeId: string) {
  const result = await database.query<{
    attempt_count: number;
    event_type: string;
    last_error: string | null;
    last_status_code: number | null;
    payload: { envelope: { id: string }; type: string };
    status: string;
  }>(
    `
      select event_type, status, attempt_count, last_status_code, last_error, payload
      from webhook_deliveries
      where payload -> 'envelope' ->> 'id' = $1
      order by created_at
    `,
    [envelopeId],
  );

  return result.rows;
}

async function withLocalStorage<T>(
  storageDir: string,
  storageService: StorageService,
  run: () => Promise<T>,
) {
  const settings = {
    EMAIL_CAPTURE_DIR: path.join(storageDir, "outbox"),
    EMAIL_DRIVER: "capture",
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_DIR: storageDir,
  };
  const before = Object.keys(settings).map(
    (name) => [name, process.env[name]] as const,
  );

  Object.assign(process.env, settings);

  try {
    return await run();
  } finally {
    for (const [name, value] of before) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    await rm(storageDir, { force: true, recursive: true });
    void storageService;
  }
}

test("completing an envelope enqueues and delivers envelope.completed", async () => {
  const receiver = await listen(200);
  const endpoint = await createWebhookEndpoint(
    {
      events: ["envelope.completed"],
      url: receiver.url,
    },
    actor,
    database,
  );
  const envelope = await createSignableEnvelope();
  const { service } = recordingEmailService();

  try {
    await submitSigningForToken(
      envelope.token,
      {
        clientTimezoneOffsetMinutes: 0,
        fields: [
          {
            fieldId: envelope.fieldId,
            imageDataUrl: DRAWN_SIGNATURE,
            inputMethod: "drawn",
            type: "signature",
          },
        ],
      },
      {
        database,
        emailService: service,
        storageService: envelope.storageService,
      },
    );

    const rows = await deliveriesFor(envelope.envelopeId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.event_type, "envelope.completed");
    assert.equal(rows[0]?.status, "delivered");
    assert.equal(rows[0]?.last_status_code, 200);
    assert.equal(receiver.received.length, 1);

    const body = JSON.parse(receiver.received[0]?.body ?? "{}") as {
      envelope: { id: string; status: string };
      type: string;
    };
    const timestamp = Number(
      receiver.received[0]?.headers["signudoc-timestamp"],
    );
    const signature = String(
      receiver.received[0]?.headers["signudoc-signature"],
    );

    assert.equal(body.type, "envelope.completed");
    assert.equal(body.envelope.id, envelope.envelopeId);
    assert.equal(body.envelope.status, "completed");
    assert.equal(
      webhookSignatureMatches(
        endpoint.secret,
        timestamp,
        receiver.received[0]?.body ?? "",
        signature,
      ),
      true,
    );
  } finally {
    await rm(envelope.storageDir, { force: true, recursive: true });
    await receiver.close();
  }
});

test("declining an envelope enqueues envelope.declined", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.declined"], url: receiver.url },
    actor,
    database,
  );
  const envelope = await createSignableEnvelope();

  try {
    await withLocalStorage(envelope.storageDir, envelope.storageService, () =>
      declineSigningForToken(
        envelope.token,
        { reason: "Not what we agreed." },
        { database },
      ),
    );

    const rows = await deliveriesFor(envelope.envelopeId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.event_type, "envelope.declined");
    assert.equal(rows[0]?.status, "delivered");
    assert.equal(receiver.received.length, 1);
  } finally {
    await receiver.close();
  }
});

test("voiding an envelope enqueues envelope.voided", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.voided"], url: receiver.url },
    actor,
    database,
  );
  const envelope = await createSignableEnvelope();

  try {
    await withLocalStorage(envelope.storageDir, envelope.storageService, () =>
      voidSentEnvelope(
        envelope.userId,
        envelope.envelopeId,
        {
          senderEmail: `${envelope.userId}@example.test`,
          senderName: "Sam Sender",
        },
        { database },
      ),
    );

    const rows = await deliveriesFor(envelope.envelopeId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.event_type, "envelope.voided");
    assert.equal(rows[0]?.status, "delivered");
  } finally {
    await receiver.close();
  }
});

test("an expired envelope still queues a webhook when the notice email fails", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.expired"], url: receiver.url },
    actor,
    database,
  );
  const now = unixNow();
  const expired = await createSentEnvelope({ expiresAt: now - 60 });
  const failing: EmailService = {
    async send() {
      throw new Error("mail is down");
    },
    async sendBatch() {
      throw new Error("not used");
    },
  };

  try {
    const failed = await runEnvelopeSchedule({
      database,
      emailService: failing,
      now,
    });

    assert.ok(failed.expiryNoticeFailures.includes(expired.envelopeId));

    const rows = await deliveriesFor(expired.envelopeId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.event_type, "envelope.expired");
    assert.equal(receiver.received.length, 1);

    const working = recordingEmailService();
    const retried = await runEnvelopeSchedule({
      database,
      emailService: working.service,
      now: now + 60,
    });

    assert.equal(retried.expiryNoticeFailures.length, 0);
    assert.equal((await deliveriesFor(expired.envelopeId)).length, 1);
    assert.equal(receiver.received.length, 1);
  } finally {
    await receiver.close();
  }
});

test("an expired envelope enqueues envelope.expired", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.expired"], url: receiver.url },
    actor,
    database,
  );
  const now = unixNow();
  const expired = await createSentEnvelope({ expiresAt: now - 60 });
  const { service } = recordingEmailService();

  try {
    await runEnvelopeSchedule({
      database,
      emailService: service,
      now,
    });

    const rows = await deliveriesFor(expired.envelopeId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.event_type, "envelope.expired");
    assert.equal(rows[0]?.payload.envelope.id, expired.envelopeId);
  } finally {
    await receiver.close();
  }
});

test("extending the deadline before enqueue saves no envelope.expired delivery", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.expired"], url: receiver.url },
    actor,
    database,
  );
  const now = unixNow();
  const expired = await createSentEnvelope({ expiresAt: now - 60 });
  const { sent, service } = recordingEmailService();
  let extended = false;
  const pool = afterStatement(
    database,
    (text) => !extended && text.includes("LEFT JOIN signers"),
    async () => {
      extended = true;
      await changeEnvelopeDeadline(
        expired.userId,
        expired.envelopeId,
        { expiresInDays: 7, senderEmail: `${expired.userId}@example.test` },
        { database, nowUnixTimestamp: now },
      );
    },
  );

  try {
    const summary = await runEnvelopeSchedule({
      database: pool,
      emailService: service,
      now,
    });

    assert.equal(extended, true);
    assert.equal(summary.expiryNoticesSent, 0);
    assert.equal(summary.expiryNoticeFailures.length, 0);
    assert.equal((await deliveriesFor(expired.envelopeId)).length, 0);
    assert.equal(receiver.received.length, 0);
    assert.equal(sent.length, 0);
  } finally {
    await receiver.close();
  }
});

test("an uncommitted deadline extension holds off and cancels envelope.expired", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.expired"], url: receiver.url },
    actor,
    database,
  );
  const now = unixNow();
  const expired = await createSentEnvelope({ expiresAt: now - 60 });
  const { sent, service } = recordingEmailService();
  const other = await database.connect();

  try {
    // A deadline extension in progress holds the envelope row lock while
    // listExpiredEnvelopesToNotify still reads the passed deadline.
    await other.query("begin");
    await other.query(
      `update envelopes set expires_at = $1, expiry_notified_at = null where id = $2`,
      [now + 7 * DAY, expired.envelopeId],
    );

    const schedule = runEnvelopeSchedule({
      database,
      emailService: service,
      now,
    });

    for (let tries = 0; ; tries += 1) {
      const waiting = await database.query(
        `select 1 from pg_stat_activity
         where datname = current_database()
           and wait_event_type = 'Lock'
           and query ilike '%from envelopes%'`,
      );
      if (waiting.rowCount) break;
      assert.ok(tries < 200, "the schedule never waited for the envelope row");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    await other.query("commit");
    const summary = await schedule;

    assert.equal(summary.expiryNoticesSent, 0);
    assert.equal(summary.expiryNoticeFailures.length, 0);
    assert.equal((await deliveriesFor(expired.envelopeId)).length, 0);
    assert.equal(receiver.received.length, 0);
    assert.equal(sent.length, 0);
  } finally {
    await other.query("rollback").catch(() => undefined);
    other.release();
    await receiver.close();
  }
});

test("a disabled endpoint or an unsubscribed event sends nothing", async () => {
  const receiver = await listen(200);
  const disabled = await createWebhookEndpoint(
    {
      enabled: false,
      events: ["envelope.completed"],
      url: receiver.url,
    },
    actor,
    database,
  );
  const other = await createWebhookEndpoint(
    {
      events: ["envelope.voided"],
      url: receiver.url,
    },
    actor,
    database,
  );
  const envelope = await createSentEnvelope({ expiresAt: unixNow() + DAY });

  try {
    const ids = await enqueueEnvelopeWebhookEvent(
      {
        envelopeId: envelope.envelopeId,
        eventType: "envelope.completed",
      },
      database,
    );

    assert.deepEqual(ids, []);
    assert.equal((await deliveriesFor(envelope.envelopeId)).length, 0);
    assert.equal(receiver.received.length, 0);
    assert.equal(disabled.enabled, false);
    assert.ok(other.events.includes("envelope.voided"));
  } finally {
    await receiver.close();
  }
});

test("without the webhook tables the caller's transaction still commits", async () => {
  const envelope = await createSentEnvelope({ expiresAt: unixNow() + DAY });
  const client = await database.connect();

  try {
    await client.query("BEGIN");
    // Stands in for a database the webhook migration has not reached yet.
    await client.query(
      `alter table webhook_deliveries rename to webhook_deliveries_hidden`,
    );
    await client.query(
      `alter table webhook_endpoints rename to webhook_endpoints_hidden`,
    );

    const ids = await enqueueEnvelopeWebhookEvent(
      {
        envelopeId: envelope.envelopeId,
        eventType: "envelope.completed",
      },
      client,
    );

    assert.deepEqual(ids, []);

    // A failed query would have aborted the transaction, and this would
    // throw "current transaction is aborted".
    const row = await client.query<{ ok: number }>(`select 1 as ok`);

    assert.equal(row.rows[0]?.ok, 1);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});

test("failed deliveries are retried with backoff and then given up", async () => {
  const receiver = await listen(500);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const delivery = await sendTestWebhookEvent(endpoint.id, actor, database);
  const firstAttemptAt = unixNow();

  try {
    assert.equal(delivery.status, "pending");
    assert.equal(delivery.attemptCount, 1);
    assert.equal(delivery.lastStatusCode, 500);
    assert.ok(
      (delivery.lastAttemptAt ?? 0) + webhookRetryDelaySeconds(1) <=
        firstAttemptAt + webhookRetryDelaySeconds(1) + 2,
    );

    const notDue = await retryDueWebhookDeliveries({
      database,
      now: firstAttemptAt + 60,
    });

    assert.equal(notDue.attempted, 0);

    await database.query(
      `
        update webhook_deliveries
        set attempt_count = $1, next_attempt_at = $2, status = 'pending'
        where id = $3
      `,
      [MAX_WEBHOOK_ATTEMPTS - 1, firstAttemptAt, delivery.id],
    );

    const last = await retryDueWebhookDeliveries({
      database,
      now: firstAttemptAt,
    });

    assert.equal(last.attempted, 1);
    assert.equal(last.failed, 1);

    const row = await database.query<{
      attempt_count: number;
      status: string;
    }>(`select status, attempt_count from webhook_deliveries where id = $1`, [
      delivery.id,
    ]);

    assert.equal(row.rows[0]?.status, "failed");
    assert.equal(row.rows[0]?.attempt_count, MAX_WEBHOOK_ATTEMPTS);
  } finally {
    await receiver.close();
  }
});

test("Send again delivers a previously failed event", async () => {
  let status = 500;
  const receiver = await listen(() => status);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const failed = await sendTestWebhookEvent(endpoint.id, actor, database);

  try {
    assert.equal(failed.status, "pending");
    status = 200;

    const retried = await retryWebhookDelivery(failed.id, database);

    assert.equal(retried.status, "delivered");
    assert.equal(retried.lastStatusCode, 200);
    assert.ok(receiver.received.length >= 2);
  } finally {
    await receiver.close();
  }
});

test("overlapping sends keep a successful delivery", async () => {
  const receiver = await listen(200, { delayMs: 400 });
  await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const envelope = await createSentEnvelope({ expiresAt: unixNow() + DAY });

  try {
    const ids = await enqueueEnvelopeWebhookEvent(
      {
        envelopeId: envelope.envelopeId,
        eventType: "envelope.completed",
      },
      database,
    );

    assert.equal(ids.length, 1);

    const [first, second] = await Promise.all([
      attemptWebhookDeliveries(ids, { database }),
      attemptWebhookDeliveries(ids, { database }),
    ]);
    const row = await database.query<{
      attempt_count: number;
      status: string;
    }>(`select status, attempt_count from webhook_deliveries where id = $1`, [
      ids[0],
    ]);

    assert.equal(receiver.received.length, 1);
    assert.equal(row.rows[0]?.status, "delivered");
    assert.equal(row.rows[0]?.attempt_count, 1);
    assert.equal(
      [first[0]?.status, second[0]?.status].includes("delivered"),
      true,
    );
  } finally {
    await receiver.close();
  }
});

test("a busy endpoint does not hide another endpoint's history", async () => {
  const quiet = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: "http://127.0.0.1:1/quiet" },
    actor,
    database,
  );
  const busy = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: "http://127.0.0.1:1/busy" },
    actor,
    database,
  );
  const now = unixNow();

  await database.query(
    `
      insert into webhook_deliveries (
        id, endpoint_id, event_id, event_type, payload, status,
        attempt_count, next_attempt_at, created_at
      )
      select
        gen_random_uuid()::text,
        $1,
        'evt-quiet',
        'envelope.completed',
        '{"id":"evt-quiet","type":"envelope.completed"}'::jsonb,
        'failed',
        1,
        $2,
        $2
    `,
    [quiet.id, now],
  );
  await database.query(
    `
      insert into webhook_deliveries (
        id, endpoint_id, event_id, event_type, payload, status,
        attempt_count, next_attempt_at, created_at
      )
      select
        gen_random_uuid()::text,
        $1,
        'evt-busy-' || i::text,
        'envelope.completed',
        '{"id":"evt","type":"envelope.completed"}'::jsonb,
        'delivered',
        1,
        $2 + i,
        $2 + i
      from generate_series(0, 209) as i
    `,
    [busy.id, now],
  );

  const listed = await listWebhookEndpoints(database);
  const quietView = listed.find((endpoint) => endpoint.id === quiet.id);
  const busyView = listed.find((endpoint) => endpoint.id === busy.id);

  assert.equal(quietView?.deliveries.length, 1);
  assert.equal(quietView?.deliveries[0]?.status, "failed");
  assert.equal(busyView?.deliveries.length, 20);
});

test("old delivery bodies expire and cannot be sent again", async () => {
  const receiver = await listen(200);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const delivery = await sendTestWebhookEvent(endpoint.id, actor, database);
  const cutoff = unixNow() - (WEBHOOK_PAYLOAD_RETENTION_DAYS + 1) * DAY;

  try {
    await database.query(
      `update webhook_deliveries set created_at = $1 where id = $2`,
      [cutoff, delivery.id],
    );

    const expired = await expireWebhookDeliveryPayloads({
      database,
      now: unixNow(),
    });
    const row = await database.query<{
      last_error: string | null;
      payload: unknown;
      status: string;
    }>(
      `select payload, status, last_error from webhook_deliveries where id = $1`,
      [delivery.id],
    );

    assert.ok(expired >= 1);
    assert.equal(row.rows[0]?.payload, null);
    assert.equal(row.rows[0]?.status, "delivered");

    await database.query(
      `update webhook_deliveries set status = 'pending' where id = $1`,
      [delivery.id],
    );

    const retried = await retryWebhookDelivery(delivery.id, database);

    assert.equal(retried.status, "failed");
    assert.equal(retried.lastError, "The stored body has expired.");
    assert.equal(receiver.received.length, 1);
  } finally {
    await receiver.close();
  }
});

test("deleting an envelope drops the stored delivery body", async () => {
  const receiver = await listen(200);
  await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const envelope = await createSentEnvelope({ expiresAt: unixNow() + DAY });

  try {
    const ids = await enqueueEnvelopeWebhookEvent(
      {
        envelopeId: envelope.envelopeId,
        eventType: "envelope.completed",
      },
      database,
    );

    assert.equal(ids.length, 1);

    await database.query(`delete from envelopes where id = $1`, [
      envelope.envelopeId,
    ]);

    const row = await database.query<{
      last_error: string | null;
      payload: unknown;
      status: string;
    }>(
      `select payload, status, last_error from webhook_deliveries where id = $1`,
      [ids[0]],
    );

    assert.equal(row.rows[0]?.payload, null);
    assert.equal(row.rows[0]?.status, "failed");
    assert.equal(row.rows[0]?.last_error, "The envelope was deleted.");
  } finally {
    await receiver.close();
  }
});

test("turning an endpoint off stops further automatic attempts", async () => {
  const receiver = await listen(500);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const delivery = await sendTestWebhookEvent(endpoint.id, actor, database);

  try {
    await updateWebhookEndpoint(
      endpoint.id,
      { enabled: false },
      actor,
      database,
    );
    await database.query(
      `update webhook_deliveries set next_attempt_at = $1 where id = $2`,
      [unixNow() - 10, delivery.id],
    );

    const retry = await retryDueWebhookDeliveries({
      database,
      now: unixNow(),
    });
    const after = await attemptWebhookDeliveries([delivery.id], { database });

    assert.equal(retry.attempted, 0);
    assert.equal(after[0]?.attemptCount, delivery.attemptCount);
    assert.equal(after[0]?.status, "pending");
  } finally {
    await receiver.close();
  }
});

test("an endpoint deleted after the retry list is read does not stop other retries", async () => {
  const receiver = await listen(500);
  const gone = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const kept = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );
  const goneDelivery = await sendTestWebhookEvent(gone.id, actor, database);
  const keptDelivery = await sendTestWebhookEvent(kept.id, actor, database);
  const now = unixNow();
  let deleted = false;

  try {
    await database.query(
      `update webhook_deliveries set next_attempt_at = $1 where id = $2`,
      [now - 20, goneDelivery.id],
    );
    await database.query(
      `update webhook_deliveries set next_attempt_at = $1 where id = $2`,
      [now - 10, keptDelivery.id],
    );
    const pool = afterStatement(
      database,
      (text) =>
        !deleted &&
        text.includes("FROM webhook_deliveries d") &&
        text.includes("ORDER BY d.next_attempt_at"),
      async () => {
        deleted = true;
        await database.query(`delete from webhook_endpoints where id = $1`, [
          gone.id,
        ]);
      },
    );

    const retry = await retryDueWebhookDeliveries({ database: pool, now });
    const afterRetry = await attemptWebhookDeliveries([keptDelivery.id], {
      database,
    });

    assert.equal(deleted, true);
    assert.equal(retry.attempted, 1);
    assert.equal(afterRetry[0]?.attemptCount, keptDelivery.attemptCount + 1);
  } finally {
    await receiver.close();
  }
});

test("deleting an endpoint mid-void skips it and the void still commits", async () => {
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.voided"], url: "http://127.0.0.1:1/gone" },
    actor,
    database,
  );
  const envelope = await createSignableEnvelope();
  const other = await database.connect();

  try {
    // An admin deletes the endpoint and has not committed yet.
    await other.query("begin");
    await other.query(`delete from webhook_endpoints where id = $1`, [
      endpoint.id,
    ]);

    const voided = withLocalStorage(
      envelope.storageDir,
      envelope.storageService,
      () =>
        voidSentEnvelope(
          envelope.userId,
          envelope.envelopeId,
          {
            senderEmail: `${envelope.userId}@example.test`,
            senderName: "Sam Sender",
          },
          { database },
        ),
    );

    // Wait until the void is queued behind the admin's row lock.
    for (let tries = 0; ; tries += 1) {
      const waiting = await database.query(
        `select 1 from pg_stat_activity where wait_event_type = 'Lock'`,
      );
      if (waiting.rowCount) break;
      assert.ok(tries < 200, "the void never waited for the endpoint row");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    await other.query("commit");
    await voided;

    const status = await database.query<{ status: string }>(
      `select status from envelopes where id = $1`,
      [envelope.envelopeId],
    );

    assert.equal(status.rows[0]?.status, "voided");
    assert.equal((await deliveriesFor(envelope.envelopeId)).length, 0);
  } finally {
    await other.query("rollback").catch(() => undefined);
    other.release();
  }
});

test("an edit does not write back a change another admin committed meanwhile", async () => {
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: "http://127.0.0.1:1/first" },
    actor,
    database,
  );
  const other = await database.connect();

  try {
    // Another admin turns the endpoint off and has not committed yet.
    await other.query("begin");
    await other.query(
      `update webhook_endpoints set enabled = false where id = $1`,
      [endpoint.id],
    );

    const edit = updateWebhookEndpoint(
      endpoint.id,
      { url: "http://127.0.0.1:1/second" },
      actor,
      database,
    );

    // Wait until the edit is queued behind the other admin's row lock.
    for (let tries = 0; ; tries += 1) {
      const waiting = await database.query(
        `select 1 from pg_stat_activity
         where wait_event_type = 'Lock' and query ilike '%webhook_endpoints%'`,
      );
      if (waiting.rowCount) break;
      assert.ok(tries < 200, "the edit never waited for the row lock");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    await other.query("commit");
    const updated = await edit;

    assert.equal(updated.url, "http://127.0.0.1:1/second");
    assert.equal(updated.enabled, false);
  } finally {
    await other.query("rollback").catch(() => undefined);
    other.release();
  }
});

// A receiver that holds the first request open until release() is called and
// answers every later request at once with laterStatus.
async function listenHoldingFirst(laterStatus: number): Promise<{
  close: () => Promise<void>;
  firstArrived: Promise<void>;
  received: number;
  release: (status: number) => void;
  url: string;
}> {
  let releaseFirst: (status: number) => void = () => undefined;
  const held = new Promise<number>((resolve) => {
    releaseFirst = resolve;
  });
  let signalArrived: () => void = () => undefined;
  const firstArrived = new Promise<void>((resolve) => {
    signalArrived = resolve;
  });
  const state = { received: 0 };
  const server: Server = createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      state.received += 1;

      if (state.received === 1) {
        signalArrived();
        void held.then((status) => {
          response.statusCode = status;
          response.end("ok");
        });
        return;
      }

      response.statusCode = laterStatus;
      response.end("ok");
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("The test receiver did not bind a port.");
  }

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    firstArrived,
    get received() {
      return state.received;
    },
    release: (status: number) => {
      releaseFirst(status);
    },
    url: `http://127.0.0.1:${String(address.port)}/hooks`,
  };
}

test("a delivery being sent is not sent again by the daily job or Send again", async () => {
  const receiver = await listenHoldingFirst(200);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );

  try {
    const sending = sendTestWebhookEvent(endpoint.id, actor, database);

    await receiver.firstArrived;

    const row = await database.query<{ id: string }>(
      `select id from webhook_deliveries where endpoint_id = $1`,
      [endpoint.id],
    );
    const deliveryId = row.rows[0]?.id ?? "";

    await retryDueWebhookDeliveries({ database, now: unixNow() + 10 * DAY });
    await assert.rejects(
      retryWebhookDelivery(deliveryId, database),
      (error: unknown) =>
        error instanceof WebhooksError && error.statusCode === 409,
    );
    assert.equal(receiver.received, 1);

    receiver.release(200);

    const delivered = await sending;

    assert.equal(delivered.status, "delivered");
    assert.equal(delivered.attemptCount, 1);
  } finally {
    receiver.release(200);
    await receiver.close();
  }
});

test("a late failure from an older attempt does not overwrite a newer success", async () => {
  const receiver = await listenHoldingFirst(200);
  const endpoint = await createWebhookEndpoint(
    { events: ["envelope.completed"], url: receiver.url },
    actor,
    database,
  );

  try {
    const slow = sendTestWebhookEvent(endpoint.id, actor, database);

    await receiver.firstArrived;

    const row = await database.query<{ id: string }>(
      `select id from webhook_deliveries where endpoint_id = $1`,
      [endpoint.id],
    );
    const deliveryId = row.rows[0]?.id ?? "";

    // The first attempt's claim runs out while it is still waiting.
    await database.query(
      `update webhook_deliveries set claimed_until = $1 where id = $2`,
      [unixNow() - 1, deliveryId],
    );

    const retried = await retryWebhookDelivery(deliveryId, database);

    assert.equal(retried.status, "delivered");
    assert.equal(retried.attemptCount, 2);

    receiver.release(500);

    const late = await slow;

    assert.equal(late.status, "delivered");
    assert.equal(late.attemptCount, 2);

    const stored = await database.query<{
      attempt_count: number;
      last_status_code: number;
      status: string;
    }>(
      `select status, attempt_count, last_status_code from webhook_deliveries where id = $1`,
      [deliveryId],
    );

    assert.equal(stored.rows[0]?.status, "delivered");
    assert.equal(stored.rows[0]?.attempt_count, 2);
    assert.equal(stored.rows[0]?.last_status_code, 200);
  } finally {
    receiver.release(200);
    await receiver.close();
  }
});
