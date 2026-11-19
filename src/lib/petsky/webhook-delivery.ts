import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { type DbPool, getDb, queryMany } from "../db/connection.ts";

/**
 * Sends the webhook deliveries that are due (see webhook-queue.ts). Each is
 * signed with the key's secret:
 *
 *   PetskySign-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>
 *
 * where the HMAC is over `${t}.${raw body}`. A 2xx answer delivers it;
 * anything else, or no answer, tries again later, backing off, until
 * MAX_ATTEMPTS.
 */

export const WEBHOOK_SIGNATURE_HEADER = "petskysign-signature";
export const MAX_ATTEMPTS = 10;
const TIMEOUT_MS = 10_000;
/** A claimed delivery is left alone this long by other workers. */
const CLAIM_LEASE_SECONDS = 120;
/** Wait after the nth failed attempt (about two days in all). */
const BACKOFF_SECONDS = [
  30,
  120,
  600,
  1800,
  3600,
  3 * 3600,
  6 * 3600,
  12 * 3600,
  24 * 3600,
];

export function backoffSeconds(failedAttempts: number): number {
  return (
    BACKOFF_SECONDS[Math.max(0, failedAttempts - 1)] ??
    BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1]!
  );
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

export function signWebhookBody(
  secret: string,
  body: string,
  timestamp: number,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return `t=${timestamp},v1=${digest}`;
}

/**
 * The check a receiver makes, kept here so the tests (and a receiver in
 * TypeScript) use the same rule. Refuses signatures older than
 * `toleranceSeconds`, so a captured request cannot be replayed later.
 */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string | null,
  { now = Math.floor(Date.now() / 1000), toleranceSeconds = 300 } = {},
): boolean {
  const parts = new Map(
    (header ?? "").split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")] as const;
    }),
  );
  const timestamp = Number(parts.get("t"));
  const given = parts.get("v1") ?? "";

  if (
    !Number.isInteger(timestamp) ||
    Math.abs(now - timestamp) > toleranceSeconds
  ) {
    return false;
  }

  const expected = signWebhookBody(secret, body, timestamp).split("v1=")[1]!;

  return (
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

type DueDelivery = {
  attempts: number;
  event: string;
  id: string;
  payload: unknown;
  revokedAt: number | null;
  webhookSecret: string | null;
  webhookUrl: string | null;
};

export type WebhookDeliverySummary = {
  delivered: number;
  failed: number;
  retrying: number;
};

type DeliverOptions = {
  database?: DbPool;
  fetchImpl?: typeof fetch;
  limit?: number;
  now?: number;
};

/** Claims due deliveries so two workers never send the same one at once. */
async function claimDueDeliveries(
  database: DbPool,
  now: number,
  limit: number,
): Promise<DueDelivery[]> {
  return queryMany<DueDelivery>(
    database,
    `
      WITH due AS (
        SELECT id
        FROM webhook_deliveries
        WHERE status = 'pending' AND next_attempt_at <= $1
        ORDER BY next_attempt_at, created_at
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      UPDATE webhook_deliveries d
      SET
        attempts = d.attempts + 1,
        last_attempt_at = $1,
        next_attempt_at = $1 + $3
      FROM due, api_keys k
      WHERE d.id = due.id AND k.id = d.api_key_id
      RETURNING
        d.id,
        d.event,
        d.payload,
        d.attempts,
        k.webhook_url AS "webhookUrl",
        k.webhook_secret AS "webhookSecret",
        k.revoked_at AS "revokedAt"
    `,
    [now, limit, CLAIM_LEASE_SECONDS],
  );
}

async function sendOne(
  delivery: DueDelivery,
  fetchImpl: typeof fetch,
): Promise<{ error: string | null; ok: boolean; statusCode: number | null }> {
  if (!delivery.webhookUrl || !delivery.webhookSecret || delivery.revokedAt) {
    return {
      error: "The API key has no webhook URL now, or was revoked.",
      ok: false,
      statusCode: null,
    };
  }

  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const response = await fetchImpl(delivery.webhookUrl, {
      body,
      headers: {
        "content-type": "application/json",
        "petskysign-delivery": delivery.id,
        "petskysign-event": delivery.event,
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(
          delivery.webhookSecret,
          body,
          timestamp,
        ),
        "user-agent": "PetskySign-Webhook/1",
      },
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // The answer is not read beyond its status; drop it.
    await response.body?.cancel().catch(() => undefined);

    return {
      error: response.ok ? null : `HTTP ${response.status}`,
      ok: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      error: (error instanceof Error ? error.message : String(error)).slice(
        0,
        500,
      ),
      ok: false,
      statusCode: null,
    };
  }
}

export async function deliverDueWebhooks({
  database = getDb(),
  fetchImpl = fetch,
  limit = 25,
  now = Math.floor(Date.now() / 1000),
}: DeliverOptions = {}): Promise<WebhookDeliverySummary> {
  const summary: WebhookDeliverySummary = {
    delivered: 0,
    failed: 0,
    retrying: 0,
  };
  const due = await claimDueDeliveries(database, now, limit);

  await Promise.all(
    due.map(async (delivery) => {
      const result = await sendOne(delivery, fetchImpl);
      const finishedAt = Math.floor(Date.now() / 1000);

      if (result.ok) {
        summary.delivered += 1;
        await database.query(
          `
            UPDATE webhook_deliveries
            SET status = 'delivered', delivered_at = $1,
                last_status_code = $2, last_error = NULL
            WHERE id = $3
          `,
          [finishedAt, result.statusCode, delivery.id],
        );
        return;
      }

      const giveUp = delivery.attempts >= MAX_ATTEMPTS;

      summary[giveUp ? "failed" : "retrying"] += 1;
      await database.query(
        `
          UPDATE webhook_deliveries
          SET status = $1, next_attempt_at = $2,
              last_status_code = $3, last_error = $4
          WHERE id = $5
        `,
        [
          giveUp ? "failed" : "pending",
          finishedAt + backoffSeconds(delivery.attempts),
          result.statusCode,
          result.error,
          delivery.id,
        ],
      );

      if (giveUp) {
        console.error(
          `[webhooks] Gave up on delivery ${delivery.id} (${delivery.event}) after ${delivery.attempts} attempts: ${result.error ?? "no answer"}`,
        );
      }
    }),
  );

  return summary;
}

/**
 * Starts a delivery round in the background, right after the transaction
 * that wrote a delivery has committed. Anything it misses (a crash, a
 * receiver that is down) is picked up by the scheduled job.
 */
export function scheduleWebhookDelivery(): void {
  // Off where only the scheduled job should send (the tests).
  if (process.env.WEBHOOK_DELIVERY_ON_COMMIT === "0") {
    return;
  }

  setTimeout(() => {
    deliverDueWebhooks().catch((error: unknown) => {
      console.error("[webhooks] A delivery round failed:", error);
    });
  }, 0);
}
