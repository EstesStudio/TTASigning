import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

import { openTestDatabase } from "../db/test-database.ts";
import { ELECTRONIC_RECORDS_DISCLOSURE_VERSION } from "../electronic-records-disclosure.ts";
import {
  getSigningPayloadForToken,
  recordSignerConsent,
  submitSigningForToken,
} from "../signing.ts";
import {
  cancelApiDocument,
  createApiDocument,
  createApiDocumentSchema,
} from "./api-documents.ts";
import {
  authenticateApiKey,
  createApiKey,
  type ApiKeyPrincipal,
} from "./api-keys.ts";
import {
  deliverDueWebhooks,
  MAX_ATTEMPTS,
  signWebhookBody,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from "./webhook-delivery.ts";

// Outgoing webhooks against a real Postgres and a real HTTP receiver.
// Run with `npm run test:db`.

type Received = {
  body: string;
  headers: Record<string, string | string[] | undefined>;
};

let database: pg.Pool;
let workDir: string;
let server: Server;
let receiverUrl: string;
let receiverStatus = 200;
const received: Received[] = [];
const createdUsers: string[] = [];
const context = { ipAddress: "203.0.113.9", userAgent: "petsky-test" };

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "petskysign-webhooks-"));
  process.env.APP_URL = "https://assinar.example.test";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = path.join(workDir, "storage");
  process.env.EMAIL_DRIVER = "capture";
  process.env.EMAIL_CAPTURE_DIR = path.join(workDir, "outbox");
  // Deliveries are sent by the test, not in the background after commit.
  process.env.WEBHOOK_DELIVERY_ON_COMMIT = "0";
  database = await openTestDatabase();
  globalThis.__signudocPgPool = database;

  server = createServer((request, response) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
      });
      response.writeHead(receiverStatus).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  receiverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
});

after(async () => {
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
  await new Promise((resolve) => server.close(resolve));
  await rm(workDir, { force: true, recursive: true });
});

const SECRET = "whsec_test_secret";

async function principalWithWebhook(
  url: string | null = receiverUrl,
): Promise<ApiKeyPrincipal> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `
      insert into public."user" (id, name, email, "emailVerified", role)
      values ($1, 'Petsky', $2, true, 'user')
    `,
    [userId, `${userId}@example.test`],
  );

  const created = await createApiKey({ name: "test", userId }, database);

  if (url) {
    await database.query(
      `update api_keys set webhook_url = $1, webhook_secret = $2 where id = $3`,
      [url, SECRET, created.id],
    );
  }

  const principal = await authenticateApiKey(created.key, database);

  assert.ok(principal);
  return principal;
}

async function sendDocument(principal: ApiKeyPrincipal) {
  const pdf = await PDFDocument.create();

  pdf.addPage([595, 842]);

  return createApiDocument(
    principal,
    createApiDocumentSchema.parse({
      companyRef: "casa-1",
      externalRef: "contrato-9",
      permittedUseConfirmed: true,
      signer: { name: "Tutor Webhook" },
      title: "Contrato",
    }),
    {
      body: await pdf.save(),
      contentType: "application/pdf",
      filename: "c.pdf",
    },
    context,
    database,
  );
}

async function sign(link: string) {
  const token = new URL(link).pathname.split("/").pop()!;
  const payload = await getSigningPayloadForToken(token, { database });
  const field = payload.currentSignerFields.find(
    (item) => item.type === "signature",
  );

  assert.ok(field);
  await recordSignerConsent(
    token,
    { disclosureVersion: ELECTRONIC_RECORDS_DISCLOSURE_VERSION },
    { database },
  );
  await submitSigningForToken(
    token,
    {
      clientTimezoneOffsetMinutes: 180,
      fields: [
        {
          fieldId: field.id,
          inputMethod: "typed",
          type: "signature",
          value: "Tutor Webhook",
        },
      ],
    },
    { database },
  );
}

async function deliveriesFor(documentId: string) {
  const result = await database.query<{
    attempts: number;
    event: string;
    lastStatusCode: number | null;
    nextAttemptAt: number;
    status: string;
  }>(
    `
      select event, status, attempts,
             last_status_code as "lastStatusCode",
             next_attempt_at as "nextAttemptAt"
      from webhook_deliveries where envelope_id = $1
      order by created_at, event
    `,
    [documentId],
  );

  return result.rows;
}

function bodiesFor(documentId: string) {
  return received
    .map((item) => ({ ...item, json: JSON.parse(item.body) }))
    .filter((item) => item.json.data.documentId === documentId);
}

test("signatures verify, and a changed body, wrong secret or old time do not", () => {
  const body = '{"event":"document.signed"}';
  const now = 1_800_000_000;
  const header = signWebhookBody(SECRET, body, now);

  assert.match(header, /^t=1800000000,v1=[0-9a-f]{64}$/);
  assert.equal(verifyWebhookSignature(SECRET, body, header, { now }), true);
  assert.equal(
    verifyWebhookSignature(SECRET, `${body} `, header, { now }),
    false,
  );
  assert.equal(verifyWebhookSignature("other", body, header, { now }), false);
  assert.equal(
    verifyWebhookSignature(SECRET, body, header, { now: now + 301 }),
    false,
  );
  assert.equal(verifyWebhookSignature(SECRET, body, null, { now }), false);
});

test("a signed document sends viewed, consented, signed and completed, signed with HMAC", async () => {
  const principal = await principalWithWebhook();
  const sent = await sendDocument(principal);

  // Sending is not an event the caller needs: it made the request itself.
  assert.deepEqual(await deliveriesFor(sent.documentId), []);

  await sign(sent.signLink!);

  const queued = await deliveriesFor(sent.documentId);

  assert.deepEqual(queued.map((row) => row.event).sort(), [
    "document.completed",
    "document.consented",
    "document.signed",
    "document.viewed",
  ]);
  assert.ok(queued.every((row) => row.status === "pending"));

  const summary = await deliverDueWebhooks({ database });

  assert.ok(summary.delivered >= 4);

  const bodies = bodiesFor(sent.documentId);

  assert.equal(bodies.length, 4);

  for (const item of bodies) {
    assert.equal(
      verifyWebhookSignature(
        SECRET,
        item.body,
        item.headers[WEBHOOK_SIGNATURE_HEADER] as string,
      ),
      true,
    );
    assert.equal(item.headers["petskysign-event"], item.json.event);
    assert.equal(item.headers["petskysign-delivery"], item.json.id);
    assert.equal(item.json.data.externalRef, "contrato-9");
    assert.equal(item.json.data.companyRef, "casa-1");
    assert.match(item.json.occurredAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  }

  const signed = bodies.find((item) => item.json.event === "document.signed");

  assert.equal(signed?.json.data.signerId, sent.signerId);
  assert.ok(
    (await deliveriesFor(sent.documentId)).every(
      (row) => row.status === "delivered" && row.attempts === 1,
    ),
  );

  // Nothing is sent twice.
  const before = received.length;

  await deliverDueWebhooks({ database });
  assert.equal(bodiesFor(sent.documentId).length, 4);
  assert.ok(received.length >= before);
});

test("a cancelled document sends document.voided", async () => {
  const principal = await principalWithWebhook();
  const sent = await sendDocument(principal);

  await cancelApiDocument(
    principal,
    sent.documentId,
    "Refeito",
    context,
    database,
  );

  assert.deepEqual(
    (await deliveriesFor(sent.documentId)).map((row) => row.event),
    ["document.voided"],
  );
});

test("a key with no webhook URL gets no deliveries", async () => {
  const principal = await principalWithWebhook(null);
  const sent = await sendDocument(principal);

  await sign(sent.signLink!);
  assert.deepEqual(await deliveriesFor(sent.documentId), []);
});

test("a failing receiver is retried later, then given up on", async () => {
  const principal = await principalWithWebhook();
  const sent = await sendDocument(principal);

  await cancelApiDocument(principal, sent.documentId, null, context, database);
  receiverStatus = 500;

  try {
    const now = Math.floor(Date.now() / 1000);

    await deliverDueWebhooks({ database, now });

    let [row] = await deliveriesFor(sent.documentId);

    assert.equal(row?.status, "pending");
    assert.equal(row?.attempts, 1);
    assert.equal(row?.lastStatusCode, 500);
    assert.ok(row!.nextAttemptAt > now);

    // Not due yet: nothing happens.
    await deliverDueWebhooks({ database, now });
    [row] = await deliveriesFor(sent.documentId);
    assert.equal(row?.attempts, 1);

    // Each later round is due again, until the attempts run out.
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt += 1) {
      await deliverDueWebhooks({ database, now: row!.nextAttemptAt });
      [row] = await deliveriesFor(sent.documentId);
      assert.equal(row?.attempts, attempt);
    }

    assert.equal(row?.status, "failed");

    // A failed delivery is not tried again.
    await deliverDueWebhooks({ database, now: row!.nextAttemptAt + 999_999 });
    [row] = await deliveriesFor(sent.documentId);
    assert.equal(row?.attempts, MAX_ATTEMPTS);
  } finally {
    receiverStatus = 200;
  }
});

test("a revoked key's deliveries are given up at once, not retried for days", async () => {
  const principal = await principalWithWebhook();
  const sent = await sendDocument(principal);

  await cancelApiDocument(principal, sent.documentId, null, context, database);
  await database.query(`update api_keys set revoked_at = 1 where id = $1`, [
    principal.keyId,
  ]);
  await deliverDueWebhooks({ database });

  const [row] = await deliveriesFor(sent.documentId);

  assert.equal(row?.status, "failed");
  assert.equal(row?.attempts, 1);
  assert.equal(bodiesFor(sent.documentId).length, 0);
});

test("a receiver that is down counts as a failed attempt", async () => {
  const principal = await principalWithWebhook("http://127.0.0.1:9/nobody");
  const sent = await sendDocument(principal);

  await cancelApiDocument(principal, sent.documentId, null, context, database);
  await deliverDueWebhooks({ database });

  const [row] = await deliveriesFor(sent.documentId);

  assert.equal(row?.status, "pending");
  assert.equal(row?.attempts, 1);
  assert.equal(row?.lastStatusCode, null);
});
