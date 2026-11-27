import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type { Pool, PoolClient, QueryResult } from "pg";

import {
  changeEnvelopeReminders,
  EnvelopeMutationError,
  getEnvelopeDetailDataForUser,
  sendDraftEnvelope,
} from "./envelopes.ts";
import { sendAutomaticEnvelopeReminder } from "./reminders.ts";
import type { EmailService } from "./services/email.ts";
import { createStorageService } from "./services/storage.ts";
import { setWebhookDrainScheduler } from "./webhooks/outbox.ts";

// Resolve next/server when running plain node --test, matching route.dbtest.ts.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^next\/[a-z-]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }

    return nextResolve(specifier, context);
  },
});

const ENV_KEYS = [
  "APP_URL",
  "EMAIL_CAPTURE_DIR",
  "EMAIL_DRIVER",
  "STORAGE_DRIVER",
  "STORAGE_LOCAL_DIR",
] as const;

let workDir: string;
let sourcePdfBytes: Uint8Array;
const previousEnv = new Map<string, string | undefined>();

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "signudoc-embedded-reminders-"));

  for (const key of ENV_KEYS) {
    previousEnv.set(key, process.env[key]);
  }

  process.env.APP_URL = "https://sign.example.test";
  process.env.EMAIL_CAPTURE_DIR = path.join(workDir, "outbox");
  process.env.EMAIL_DRIVER = "capture";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = path.join(workDir, "storage");
  setWebhookDrainScheduler(() => undefined);

  const doc = await PDFDocument.create();

  doc.addPage([612, 792]);
  sourcePdfBytes = await doc.save();
});

after(async () => {
  setWebhookDrainScheduler(null);

  for (const [key, value] of previousEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  await rm(workDir, { force: true, recursive: true });
});

type StoredEnvelope = {
  completedAt: number | null;
  createdAt: number;
  declinedAt: number | null;
  delivery: "email" | "embedded";
  evidenceKey: string | null;
  expiresAt: number | null;
  id: string;
  pageCount: number;
  part11: boolean;
  reminderIntervalDays: number | null;
  sentAt: number | null;
  signatureLevel: "advanced" | "qualified" | "simple";
  signatureProvider: string | null;
  signedPdfKey: string | null;
  sourcePdfFilename: string;
  sourcePdfHash: string;
  sourcePdfKey: string;
  sourcePdfSizeBytes: number;
  status: "draft" | "sent" | "completed" | "declined" | "voided";
  title: string;
  updatedAt: number;
  userId: string;
  voidedAt: number | null;
};

function queryResult<T>(rows: T[], rowCount = rows.length): QueryResult {
  return {
    command: "",
    fields: [],
    oid: 0,
    rowCount,
    rows,
  } as unknown as QueryResult;
}

async function createFakeDb(initial: {
  delivery: "email" | "embedded";
  reminderIntervalDays: number | null;
  status: "draft" | "sent";
}) {
  const now = 1_800_000_000;
  const userId = randomUUID();
  const envelopeId = randomUUID();
  const signerId = randomUUID();
  const sourcePdfKey = `envelopes/${userId}/${envelopeId}/source.pdf`;

  if (initial.status === "draft") {
    await createStorageService().putObject({
      body: sourcePdfBytes,
      contentType: "application/pdf",
      key: sourcePdfKey,
    });
  }

  const envelope: StoredEnvelope = {
    completedAt: null,
    createdAt: now,
    declinedAt: null,
    delivery: initial.delivery,
    evidenceKey: null,
    expiresAt: initial.status === "sent" ? now + 86_400 * 30 : null,
    id: envelopeId,
    pageCount: 1,
    part11: false,
    reminderIntervalDays: initial.reminderIntervalDays,
    sentAt: initial.status === "sent" ? now : null,
    signatureLevel: "simple",
    signatureProvider: null,
    signedPdfKey: null,
    sourcePdfFilename: "agreement.pdf",
    sourcePdfHash: "a".repeat(64),
    sourcePdfKey,
    sourcePdfSizeBytes: sourcePdfBytes.byteLength,
    status: initial.status,
    title: "Service agreement",
    updatedAt: now,
    userId,
    voidedAt: null,
  };
  const signer = {
    createdAt: now,
    declineReason: null,
    declinedAt: null,
    email: "casey@example.test",
    envelopeId,
    id: signerId,
    lastNotifiedAt: initial.status === "sent" ? now : null,
    lastNudgedAt: null,
    name: "Casey Client",
    role: "signer" as const,
    signatureMeaning: null,
    signedAt: null,
    signOrder: 1,
    signingStep: 1,
    signingTokenExpiresAt: initial.status === "sent" ? now + 86_400 * 30 : null,
    signingTokenHash: initial.status === "sent" ? "b".repeat(64) : null,
    status:
      initial.status === "sent" ? ("notified" as const) : ("pending" as const),
    turnStartedAt: initial.status === "sent" ? now : null,
    updatedAt: now,
  };
  const field = {
    checked: null,
    createdAt: now,
    envelopeId,
    groupId: null,
    height: 0.05,
    id: randomUUID(),
    imageKey: null,
    inputMethod: null,
    label: null,
    options: null,
    page: 1,
    required: true,
    signerId,
    submittedAt: null,
    type: "signature" as const,
    updatedAt: now,
    value: null,
    width: 0.3,
    x: 0.1,
    y: 0.7,
  };
  const auditEvents: Array<{ event: string; metadata: unknown }> = [];

  async function execute(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult> {
    const sql = text.replace(/\s+/g, " ").trim();

    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return queryResult([], 0);
    }

    if (sql.startsWith("SELECT pg_advisory_xact_lock")) {
      return queryResult([{ pg_advisory_xact_lock: "" }], 1);
    }

    if (sql.toLowerCase().includes("app_settings")) {
      return queryResult([
        {
          allowed_email_domains: [],
          brand_color: null,
          consent_disclosure: null,
          email_ready_at: null,
          logo_hash: null,
          organization_name: "Acme Test",
          part11_mode: false,
          privacy_url: null,
          require_two_factor: false,
          retention_days: null,
          sender_address: null,
          session_idle_minutes: null,
          session_max_hours: null,
          setup_completed_at: 1_700_000_000,
          signup_mode: "open",
          support_address: null,
          terms_url: null,
        },
      ]);
    }

    if (sql.includes("FROM embed_allowed_origins")) {
      return queryResult([{ any: true }]);
    }

    if (sql.startsWith("SELECT delivery FROM envelopes")) {
      if (
        values[0] === envelope.id &&
        (values[1] === null || values[1] === envelope.userId)
      ) {
        return queryResult([{ delivery: envelope.delivery }]);
      }

      return queryResult([]);
    }

    if (sql.includes("FROM envelopes WHERE id = $1 AND user_id = $2")) {
      if (values[0] === envelope.id && values[1] === envelope.userId) {
        return queryResult([{ ...envelope }]);
      }

      return queryResult([]);
    }

    if (sql.includes("FROM signers") && sql.includes("role = 'cc'")) {
      return queryResult([]);
    }

    if (
      sql.includes("access_code_hash IS NOT NULL") &&
      sql.includes("FROM signers")
    ) {
      return queryResult([
        {
          hasAccessCode: false,
          id: signer.id,
          requireEmailCode: false,
          signatureMeaning: null,
        },
      ]);
    }

    if (sql.includes("FROM signers WHERE envelope_id IN")) {
      return queryResult(values.includes(envelopeId) ? [{ ...signer }] : []);
    }

    if (sql.includes("FROM fields WHERE envelope_id IN")) {
      return queryResult(values.includes(envelopeId) ? [{ ...field }] : []);
    }

    if (sql.includes("FROM envelope_pages WHERE envelope_id = $1")) {
      return queryResult([
        {
          envelopeId,
          heightPt: 792,
          id: "page-1",
          pageNumber: 1,
          widthPt: 612,
        },
      ]);
    }

    if (sql.includes("FROM audit_events")) {
      return queryResult([]);
    }

    if (sql.startsWith("INSERT INTO audit_events")) {
      auditEvents.push({
        event: String(values[2]),
        metadata: values[7],
      });
      return queryResult([], 1);
    }

    if (sql.startsWith("UPDATE envelopes SET status = 'sent'")) {
      if (
        values[2] === envelope.id &&
        values[3] === envelope.userId &&
        envelope.status === "draft"
      ) {
        envelope.status = "sent";
        envelope.sentAt = Number(values[0]);
        envelope.updatedAt = Number(values[1]);
        envelope.expiresAt = Number(values[4]);
        envelope.reminderIntervalDays = (values[5] as number | null) ?? null;
        return queryResult([], 1);
      }

      return queryResult([], 0);
    }

    if (sql.startsWith("UPDATE envelopes SET delivery = 'embedded'")) {
      envelope.delivery = "embedded";
      return queryResult([], 1);
    }

    if (sql.startsWith("UPDATE envelopes SET reminder_interval_days = $1")) {
      if (
        values[2] === envelope.id &&
        values[3] === envelope.userId &&
        envelope.status === "sent" &&
        envelope.delivery === "email"
      ) {
        envelope.reminderIntervalDays = (values[0] as number | null) ?? null;
        envelope.updatedAt = Number(values[1]);
        return queryResult([], 1);
      }

      return queryResult([], 0);
    }

    if (sql.startsWith("UPDATE signers SET status = 'pending'")) {
      return queryResult([], 1);
    }

    if (sql.startsWith("UPDATE signers SET status = 'notified'")) {
      signer.status = "notified";
      signer.lastNotifiedAt = Number(values[3]);
      return queryResult([], 1);
    }

    if (
      sql.startsWith("INSERT INTO webhook_deliveries") ||
      sql.startsWith("UPDATE webhook_deliveries")
    ) {
      return queryResult([], 0);
    }

    throw new Error(`Unexpected SQL in embedded-reminders.test.ts: ${sql}`);
  }

  const client = {
    query: (text: string, values?: unknown[]) => execute(text, values),
    release: () => undefined,
  } as unknown as PoolClient;
  const pool = {
    connect: async () => client,
    query: (text: string, values?: unknown[]) => execute(text, values),
    totalCount: 1,
  } as unknown as Pool;

  return { auditEvents, envelope, envelopeId, pool, userId };
}

const unusedEmail: EmailService = {
  async send() {
    throw new Error("embedded envelopes must not send reminder emails");
  },
  async sendBatch() {
    throw new Error("not used");
  },
};

test("sending an embedded envelope refuses a non-null reminderIntervalDays with HTTP 400 (issue #246)", async () => {
  const db = await createFakeDb({
    delivery: "email",
    reminderIntervalDays: null,
    status: "draft",
  });
  let caught: unknown;

  try {
    await sendDraftEnvelope(
      db.userId,
      db.envelopeId,
      {
        delivery: "embedded",
        reminderIntervalDays: 5,
        senderEmail: "sender@example.test",
        senderName: "Alex Sender",
      },
      { database: db.pool },
    );
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof EnvelopeMutationError);
  assert.equal(caught.statusCode, 400);
  assert.match(caught.message, /Embedded envelopes do not send/);
  assert.equal(db.envelope.status, "draft");
  assert.equal(db.envelope.reminderIntervalDays, null);

  const { apiErrorFor } = await import("./api/route.ts");
  const apiResponse = apiErrorFor(caught);

  assert.ok(apiResponse);
  assert.equal(apiResponse.status, 400);
  assert.deepEqual(await apiResponse.json(), {
    error: {
      code: "invalid_request",
      message: caught.message,
    },
  });
});

test("sending an embedded envelope with reminderIntervalDays null or omitted succeeds with null schedule (issue #246)", async () => {
  for (const reminderIntervalDays of [undefined, null] as const) {
    const db = await createFakeDb({
      delivery: "email",
      reminderIntervalDays: null,
      status: "draft",
    });

    const sent = await sendDraftEnvelope(
      db.userId,
      db.envelopeId,
      {
        delivery: "embedded",
        reminderIntervalDays,
        senderEmail: "sender@example.test",
        senderName: "Alex Sender",
      },
      { database: db.pool },
    );

    assert.equal(sent.envelopeId, db.envelopeId);
    assert.equal(db.envelope.status, "sent");
    assert.equal(db.envelope.delivery, "embedded");
    assert.equal(db.envelope.reminderIntervalDays, null);
  }
});

test("changeEnvelopeReminders refuses embedded envelopes with 409 while emailed envelopes still save (issue #246)", async () => {
  const embedded = await createFakeDb({
    delivery: "embedded",
    reminderIntervalDays: null,
    status: "sent",
  });

  await assert.rejects(
    changeEnvelopeReminders(embedded.userId, embedded.envelopeId, 1, {
      database: embedded.pool,
    }),
    (error: unknown) =>
      error instanceof EnvelopeMutationError &&
      error.statusCode === 409 &&
      /does not send automatic reminders/.test(error.message),
  );
  assert.equal(embedded.envelope.reminderIntervalDays, null);

  const emailed = await createFakeDb({
    delivery: "email",
    reminderIntervalDays: 5,
    status: "sent",
  });
  const saved = await changeEnvelopeReminders(
    emailed.userId,
    emailed.envelopeId,
    1,
    { database: emailed.pool },
  );

  assert.deepEqual(saved, {
    envelopeId: emailed.envelopeId,
    reminderIntervalDays: 1,
  });
  assert.equal(emailed.envelope.reminderIntervalDays, 1);
});

test("envelope detail hides any legacy reminder schedule on embedded envelopes and automatic reminders skip them (issue #246)", async () => {
  const legacyEmbedded = await createFakeDb({
    delivery: "embedded",
    reminderIntervalDays: 5,
    status: "sent",
  });
  const detail = await getEnvelopeDetailDataForUser(
    legacyEmbedded.userId,
    legacyEmbedded.envelopeId,
    legacyEmbedded.pool,
  );

  assert.equal(detail?.delivery, "embedded");
  assert.equal(detail?.reminderIntervalDays, null);

  const sent = await sendAutomaticEnvelopeReminder(legacyEmbedded.envelopeId, {
    database: legacyEmbedded.pool,
    emailService: unusedEmail,
  });

  assert.equal(sent, false);

  const emailed = await createFakeDb({
    delivery: "email",
    reminderIntervalDays: 5,
    status: "sent",
  });
  const emailedDetail = await getEnvelopeDetailDataForUser(
    emailed.userId,
    emailed.envelopeId,
    emailed.pool,
  );

  assert.equal(emailedDetail?.delivery, "email");
  assert.equal(emailedDetail?.reminderIntervalDays, 5);
});
