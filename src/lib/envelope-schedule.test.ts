import assert from "node:assert/strict";
import { test } from "node:test";

import type { Pool, PoolClient, QueryResult } from "pg";

import { buildExpiryNotice, runEnvelopeSchedule } from "./envelope-schedule.ts";
import type {
  EmailService,
  TransactionalEmailMessage,
} from "./services/email.ts";

const EXPIRED_AT = Date.parse("2026-11-24T06:34:00.000Z") / 1000;

test("buildExpiryNotice tells embedded senders to request a fresh signing link instead of promising reuse (issue #247)", () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://sign.example.test";

  try {
    const embeddedNotice = buildExpiryNotice({
      delivery: "embedded",
      expiresAt: EXPIRED_AT,
      id: "env-embedded",
      ownerEmail: "sender@example.test",
      ownerName: "Example Sender",
      title: "Portal agreement",
      waitingOn: "Robin Example (portal-signer@example.test)",
    });

    assert.equal(embeddedNotice.template, "expiry_notice");
    assert.equal(
      embeddedNotice.subject,
      '"Portal agreement" expired before everyone signed',
    );
    assert.equal(embeddedNotice.to, "sender@example.test");
    assert.doesNotMatch(
      embeddedNotice.textBody,
      /The signing link that was already sent will work again\./,
    );
    assert.match(
      embeddedNotice.textBody,
      /open the envelope and set a new deadline/,
    );
    assert.match(
      embeddedNotice.textBody,
      /Previous embedded signing links stay expired/,
    );
    assert.match(embeddedNotice.textBody, /request a fresh signing link/);
    assert.match(
      embeddedNotice.textBody,
      /https:\/\/sign\.example\.test\/envelopes\/env-embedded$/,
    );

    const emailNotice = buildExpiryNotice({
      delivery: "email",
      expiresAt: EXPIRED_AT,
      id: "env-email",
      ownerEmail: "sender@example.test",
      ownerName: "Example Sender",
      title: "Email agreement",
      waitingOn: "Robin Example (mail-signer@example.test)",
    });

    assert.equal(emailNotice.template, "expiry_notice");
    assert.match(
      emailNotice.textBody,
      /The signing link that was already sent will work again\./,
    );
    assert.match(
      emailNotice.textBody,
      /https:\/\/sign\.example\.test\/envelopes\/env-email$/,
    );
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = previousAppUrl;
    }
  }
});

test("runEnvelopeSchedule selects delivery and sends delivery-accurate expiry notices (issue #247)", async () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://sign.example.test";

  try {
    const queryResult = <T>(rows: T[], rowCount = rows.length): QueryResult =>
      ({
        command: "",
        fields: [],
        oid: 0,
        rowCount,
        rows,
      }) as unknown as QueryResult;

    const expiredRows = [
      {
        delivery: "embedded" as const,
        expiresAt: EXPIRED_AT,
        id: "env-embedded",
        ownerEmail: "sender@example.test",
        ownerName: "Example Sender",
        title: "Portal agreement",
        waitingOn: "Robin Example (portal-signer@example.test)",
      },
      {
        delivery: "email" as const,
        expiresAt: EXPIRED_AT,
        id: "env-email",
        ownerEmail: "sender@example.test",
        ownerName: "Example Sender",
        title: "Email agreement",
        waitingOn: "Robin Example (mail-signer@example.test)",
      },
    ];
    let selectedDeliveryColumn = false;
    const sent: TransactionalEmailMessage[] = [];

    const execute = async (
      text: string,
      values: unknown[] = [],
    ): Promise<QueryResult> => {
      const sql = text.replace(/\s+/g, " ").trim();

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return queryResult([], 0);
      }

      if (sql.startsWith("SELECT pg_advisory_xact_lock")) {
        return queryResult([{ pg_advisory_xact_lock: "" }], 1);
      }

      if (
        sql.includes("FROM envelopes e") &&
        sql.includes("e.expiry_notified_at IS NULL")
      ) {
        selectedDeliveryColumn = sql.includes("e.delivery");
        return queryResult(expiredRows);
      }

      if (
        sql.startsWith("SELECT id FROM envelopes") &&
        sql.includes("expiry_notified_at IS NULL")
      ) {
        return queryResult([{ id: String(values[0]) }]);
      }

      if (sql.startsWith("UPDATE envelopes SET expiry_notified_at = $1")) {
        return queryResult([], 1);
      }

      if (sql.includes("SELECT sequence, row_hash")) {
        return queryResult([]);
      }

      if (sql.startsWith("INSERT INTO audit_events")) {
        return queryResult([], 1);
      }

      if (sql.startsWith("INSERT INTO webhook_deliveries")) {
        return queryResult([], 0);
      }

      if (sql.includes("FROM envelopes e JOIN signers s")) {
        return queryResult([]);
      }

      throw new Error(`Unexpected SQL in envelope-schedule.test.ts: ${sql}`);
    };

    const client = {
      query: (text: string, values?: unknown[]) => execute(text, values),
      release: () => undefined,
    } as unknown as PoolClient;
    const database = {
      connect: async () => client,
      query: (text: string, values?: unknown[]) => execute(text, values),
    } as unknown as Pool;
    const emailService: EmailService = {
      async send(message) {
        sent.push(message);
        return { accepted: [message.to], messageId: "m-1", rejected: [] };
      },
      async sendBatch() {
        throw new Error("not used");
      },
    };

    const summary = await runEnvelopeSchedule({
      database,
      emailService,
      now: EXPIRED_AT + 60,
    });

    assert.equal(selectedDeliveryColumn, true);
    assert.equal(summary.expiryNoticesSent, 2);
    assert.deepEqual(summary.expiryNoticeFailures, []);

    const embeddedMail = sent.find((message) =>
      message.subject.includes("Portal agreement"),
    );
    const emailedMail = sent.find((message) =>
      message.subject.includes("Email agreement"),
    );

    assert.ok(embeddedMail);
    assert.ok(emailedMail);
    assert.doesNotMatch(
      embeddedMail.textBody,
      /The signing link that was already sent will work again\./,
    );
    assert.match(embeddedMail.textBody, /request a fresh signing link/);
    assert.match(
      emailedMail.textBody,
      /The signing link that was already sent will work again\./,
    );
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = previousAppUrl;
    }
  }
});
