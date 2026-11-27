import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import type { Pool, PoolClient, QueryResult } from "pg";

import { getEnvelopeDetailDataForUser } from "../envelopes.ts";
import {
  ReminderMutationError,
  sendManualEnvelopeNudge,
} from "../reminders.ts";
import type { EmailService } from "./email.ts";
import {
  formatReminderAvailableAt,
  formatReminderInterval,
  getAutomaticReminderDueAt,
  isAutomaticReminderDue,
} from "./reminders.ts";

// Resolve next/server when running plain node --test, matching route.dbtest.ts.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^next\/[a-z-]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }

    return nextResolve(specifier, context);
  },
});

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const SENT = 1_800_000_000;

test("an automatic reminder is due half a day before its interval is up", () => {
  assert.equal(getAutomaticReminderDueAt(SENT, 3), SENT + 3 * DAY - 12 * HOUR);

  const signer = { intervalDays: 1, lastNotifiedAt: SENT, lastNudgedAt: null };

  // Sent an hour after the job ran: the next day's run still counts.
  assert.equal(isAutomaticReminderDue(signer, SENT + 23 * HOUR), true);
  assert.equal(isAutomaticReminderDue(signer, SENT + 12 * HOUR), true);
  assert.equal(isAutomaticReminderDue(signer, SENT + 11 * HOUR), false);
});

test("the interval counts from the last invitation or reminder of any kind", () => {
  const reminded = {
    intervalDays: 2,
    lastNotifiedAt: SENT,
    lastNudgedAt: SENT + 5 * DAY,
  };

  assert.equal(isAutomaticReminderDue(reminded, SENT + 6 * DAY), false);
  assert.equal(isAutomaticReminderDue(reminded, SENT + 7 * DAY), true);
});

test("a signer who was never written to gets no reminder", () => {
  assert.equal(
    isAutomaticReminderDue(
      { intervalDays: 1, lastNotifiedAt: null, lastNudgedAt: null },
      SENT,
    ),
    false,
  );
});

test("an interval is named the way a person would say it", () => {
  assert.equal(formatReminderInterval(null), "Off");
  assert.equal(formatReminderInterval(1), "Every day");
  assert.equal(formatReminderInterval(3), "Every 3 days");
  assert.equal(formatReminderInterval(7), "Every week");
});

test("reminder cooldown time is formatted in explicit UTC with plain spaces (issue #234)", () => {
  const capturedCooldown = Date.parse("2026-11-23T06:34:50.000Z") / 1000;
  const eveningCooldown = Date.parse("2026-12-12T21:20:00.000Z") / 1000;

  assert.equal(
    formatReminderAvailableAt(capturedCooldown),
    "November 23 at 6:34 AM UTC",
  );
  assert.equal(
    formatReminderAvailableAt(eveningCooldown),
    "December 12 at 9:20 PM UTC",
  );
});

test("reminder cooldown formatting stays in UTC regardless of server TZ (issue #234)", () => {
  const moduleUrl = pathToFileURL(
    path.join(import.meta.dirname, "reminders.ts"),
  ).href;
  const timestamp = Date.parse("2026-11-23T06:34:50.000Z") / 1000;

  for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
    const output = execFileSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "--input-type=module",
        "-e",
        `import { formatReminderAvailableAt } from ${JSON.stringify(moduleUrl)}; process.stdout.write(formatReminderAvailableAt(${String(timestamp)}));`,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, TZ: tz },
      },
    );

    assert.equal(
      output,
      "November 23 at 6:34 AM UTC",
      `TZ=${tz} should still format in UTC`,
    );
  }
});

test("premature manual reminder returns 429 with UTC availability message matching detail page (issue #234)", async () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://sign.example.test";

  try {
    const lastNudgedAt = Math.floor(Date.now() / 1000) - 60;
    const expectedAvailableAt = lastNudgedAt + DAY;
    const expectedLabel = formatReminderAvailableAt(expectedAvailableAt);
    const expectedMessage = `You can send another reminder after ${expectedLabel}.`;

    const queryResult = <T>(rows: T[]): QueryResult =>
      ({
        command: "",
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows,
      }) as unknown as QueryResult;

    const execute = async (sql: string): Promise<QueryResult> => {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (
        normalized === "BEGIN" ||
        normalized === "COMMIT" ||
        normalized === "ROLLBACK"
      ) {
        return queryResult([]);
      }

      if (normalized.startsWith("SELECT delivery FROM envelopes")) {
        return queryResult([{ delivery: "email" }]);
      }

      if (
        normalized.startsWith("SELECT id FROM signers") &&
        normalized.includes("status = 'notified'")
      ) {
        return queryResult([{ id: "signer-1" }]);
      }

      if (normalized.includes("FROM envelopes e JOIN")) {
        return queryResult([
          {
            delivery: "email",
            expiresAt: lastNudgedAt + 2 * DAY,
            id: "env-1",
            ownerEmail: "sender@example.test",
            ownerName: "Test Administrator",
            reminderIntervalDays: null,
            status: "sent",
            title: "Reminder timezone example",
            updatedAt: lastNudgedAt,
            userId: "user-1",
          },
        ]);
      }

      if (
        normalized.includes("FROM envelopes WHERE id = $1 AND user_id = $2")
      ) {
        return queryResult([
          {
            completedAt: null,
            createdAt: lastNudgedAt - 60,
            declinedAt: null,
            evidenceKey: null,
            expiresAt: lastNudgedAt + 2 * DAY,
            id: "env-1",
            pageCount: 1,
            part11: false,
            reminderIntervalDays: null,
            sentAt: lastNudgedAt - 30,
            signatureLevel: "simple",
            signatureProvider: null,
            signedPdfKey: null,
            sourcePdfFilename: "agreement.pdf",
            sourcePdfHash: "a".repeat(64),
            sourcePdfKey: "envelopes/user-1/env-1/source.pdf",
            sourcePdfSizeBytes: 1024,
            status: "sent",
            title: "Reminder timezone example",
            updatedAt: lastNudgedAt,
            userId: "user-1",
            voidedAt: null,
          },
        ]);
      }

      if (normalized.includes("FROM signers WHERE envelope_id = $1")) {
        if (normalized.includes("role = 'cc'")) {
          return queryResult([]);
        }

        return queryResult([
          {
            email: "casey@example.test",
            envelopeId: "env-1",
            id: "signer-1",
            lastNotifiedAt: lastNudgedAt,
            lastNudgedAt,
            name: "Casey Client",
            role: "signer",
            signOrder: 1,
            signingTokenExpiresAt: lastNudgedAt + 2 * DAY,
            signingTokenHash: "a".repeat(64),
            status: "notified",
            updatedAt: lastNudgedAt,
          },
        ]);
      }

      if (normalized.includes("FROM signers WHERE envelope_id IN")) {
        return queryResult([
          {
            createdAt: lastNudgedAt - 60,
            declineReason: null,
            declinedAt: null,
            email: "casey@example.test",
            envelopeId: "env-1",
            id: "signer-1",
            lastNotifiedAt: lastNudgedAt,
            lastNudgedAt,
            name: "Casey Client",
            role: "signer",
            signatureMeaning: null,
            signedAt: null,
            signOrder: 1,
            signingStep: 1,
            signingTokenExpiresAt: lastNudgedAt + 2 * DAY,
            signingTokenHash: "a".repeat(64),
            status: "notified",
            turnStartedAt: lastNudgedAt - 30,
            updatedAt: lastNudgedAt,
          },
        ]);
      }

      if (normalized.includes("FROM fields WHERE envelope_id IN")) {
        return queryResult([]);
      }

      if (normalized.includes("FROM audit_events")) {
        return queryResult([]);
      }

      throw new Error(`Unexpected SQL: ${normalized}`);
    };

    const client = {
      query: (sql: string) => execute(sql),
      release: () => undefined,
    } as unknown as PoolClient;
    const database = {
      connect: async () => client,
      query: (sql: string) => execute(sql),
    } as unknown as Pool;
    const emailService: EmailService = {
      async send() {
        throw new Error("should not send while in cooldown");
      },
      async sendBatch() {
        throw new Error("should not send while in cooldown");
      },
    };

    const detail = await getEnvelopeDetailDataForUser(
      "user-1",
      "env-1",
      database,
    );

    assert.equal(detail?.manualReminder?.canSend, false);
    assert.equal(detail?.manualReminder?.nextAvailableAtLabel, expectedLabel);

    let caught: unknown;

    try {
      await sendManualEnvelopeNudge(
        "user-1",
        "env-1",
        {
          senderEmail: "sender@example.test",
          senderName: "Test Administrator",
        },
        { database, emailService, nowUnixTimestamp: lastNudgedAt + 60 },
      );
    } catch (error) {
      caught = error;
    }

    assert.ok(caught instanceof ReminderMutationError, String(caught));
    assert.equal(caught.statusCode, 429);
    assert.equal(caught.nextAvailableAt, expectedAvailableAt);
    assert.equal(caught.nextAvailableAtLabel, expectedLabel);
    assert.equal(caught.message, expectedMessage);
    assert.match(caught.message, / UTC\.$/);

    const { apiErrorFor } = await import("../api/route.ts");
    const apiResponse = apiErrorFor(caught);

    assert.ok(apiResponse);
    assert.equal(apiResponse.status, 429);

    const retryAfter = Number(apiResponse.headers.get("retry-after"));

    assert.ok(retryAfter > 0 && retryAfter <= DAY);
    assert.deepEqual(await apiResponse.json(), {
      error: {
        code: "rate_limited",
        message: expectedMessage,
      },
    });
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = previousAppUrl;
    }
  }
});
