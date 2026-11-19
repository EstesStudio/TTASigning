import { randomUUID } from "node:crypto";

import type { DbExecutor } from "../db/connection.ts";

/**
 * Which audit events become webhooks, and under what name. Only envelopes
 * sent through the API with a key that has a webhook URL get any.
 */
export const WEBHOOK_EVENTS = {
  completed: "document.completed",
  consented: "document.consented",
  declined: "document.declined",
  expired: "document.expired",
  signed: "document.signed",
  viewed: "document.viewed",
  voided: "document.voided",
} as const;

export type WebhookEventName =
  (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export function webhookEventFor(auditEvent: string): WebhookEventName | null {
  return Object.hasOwn(WEBHOOK_EVENTS, auditEvent)
    ? WEBHOOK_EVENTS[auditEvent as keyof typeof WEBHOOK_EVENTS]
    : null;
}

/**
 * Writes the delivery for an audit event, in the caller's transaction, so a
 * webhook exists exactly when the event does. Returns whether one was
 * written: false for events that are not sent, and for envelopes that did
 * not come through the API or whose key has no webhook URL.
 */
export async function enqueueWebhookForAuditEvent(
  input: {
    auditEventId: string;
    createdAt: number;
    envelopeId: string;
    event: string;
    metadata: Record<string, unknown> | null | undefined;
  },
  database: DbExecutor,
): Promise<boolean> {
  const webhookEvent = webhookEventFor(input.event);

  if (!webhookEvent) {
    return false;
  }

  const signerId =
    typeof input.metadata?.signerId === "string"
      ? input.metadata.signerId
      : null;
  const deliveryId = randomUUID();
  const result = await database.query(
    `
      INSERT INTO webhook_deliveries (
        id, api_key_id, envelope_id, audit_event_id, event, payload,
        next_attempt_at
      )
      SELECT
        $1,
        k.id,
        e.id,
        $2,
        $3,
        jsonb_build_object(
          'id', $1::text,
          'event', $3::text,
          'occurredAt', to_char(
            to_timestamp($4::bigint) AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
          ),
          'data', jsonb_build_object(
            'documentId', e.id,
            'externalRef', e.external_ref,
            'companyRef', e.company_ref,
            'signerId', $5::text
          )
        ),
        $4
      FROM envelopes e
      JOIN api_keys k ON k.id = e.api_key_id
      WHERE e.id = $6
        AND k.webhook_url IS NOT NULL
        AND k.revoked_at IS NULL
      ON CONFLICT ON CONSTRAINT webhook_deliveries_event_unique DO NOTHING
    `,
    [
      deliveryId,
      input.auditEventId,
      webhookEvent,
      input.createdAt,
      signerId,
      input.envelopeId,
    ],
  );

  return (result.rowCount ?? 0) > 0;
}
