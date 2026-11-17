import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

import {
  type DbExecutor,
  type DbPool,
  getDb,
  queryMany,
  queryOne,
  withTransaction,
} from "./db/connection.ts";
import {
  webhookEndpointCreateSchema,
  webhookEndpointPatchSchema,
  webhookEventTypes,
  type WebhookDeliveryStatus,
  type WebhookDeliveryView,
  type WebhookEndpointCreated,
  type WebhookEndpointView,
  type WebhookEventType,
} from "./schemas/webhooks.ts";
import { recordSystemAuditEvent } from "./services/system-audit.ts";
import { isMissingSchemaError } from "./settings.ts";
import { isProduction, resolveAppUrl, type EnvSource } from "./utils/env.ts";

// Outbound HTTPS callbacks when an envelope finishes, is declined, is voided,
// or expires. Administrators add the URL under Settings. Each body is signed
// with HMAC-SHA256; failed deliveries are tried again from the daily job.

export {
  webhookEventTypes,
  type WebhookDeliveryStatus,
  type WebhookDeliveryView,
  type WebhookEndpointCreated,
  type WebhookEndpointView,
  type WebhookEventType,
};

export const MAX_WEBHOOK_ATTEMPTS = 5;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 8_000;
export const WEBHOOK_PAYLOAD_RETENTION_DAYS = 30;
/** How long a claimed send holds the row, longer than the POST timeout. */
export const WEBHOOK_CLAIM_LEASE_SECONDS = 60;
const DAY_SECONDS = 24 * 60 * 60;
const SECRET_BYTES = 32;
const MAX_ERROR_LENGTH = 500;
const MAX_DELIVERIES_PER_ENDPOINT = 20;
const RETRY_BATCH_SIZE = 50;
const STORED_BODY_EXPIRED_MESSAGE = "The stored body has expired.";

const blockedIpv4 = new BlockList();
blockedIpv4.addSubnet("0.0.0.0", 8, "ipv4");
blockedIpv4.addSubnet("10.0.0.0", 8, "ipv4");
blockedIpv4.addSubnet("100.64.0.0", 10, "ipv4");
blockedIpv4.addSubnet("127.0.0.0", 8, "ipv4");
blockedIpv4.addSubnet("169.254.0.0", 16, "ipv4");
blockedIpv4.addSubnet("172.16.0.0", 12, "ipv4");
blockedIpv4.addSubnet("192.168.0.0", 16, "ipv4");
blockedIpv4.addSubnet("198.18.0.0", 15, "ipv4");
blockedIpv4.addSubnet("224.0.0.0", 4, "ipv4");
blockedIpv4.addSubnet("240.0.0.0", 4, "ipv4");

const blockedIpv6 = new BlockList();
blockedIpv6.addAddress("::1", "ipv6");
blockedIpv6.addSubnet("::", 128, "ipv6");
blockedIpv6.addSubnet("fc00::", 7, "ipv6");
blockedIpv6.addSubnet("fe80::", 10, "ipv6");

const METADATA_HOSTS = new Set([
  "instance-data",
  "metadata",
  "metadata.google.com",
  "metadata.google.internal",
]);

export class WebhooksError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WebhooksError";
    this.statusCode = statusCode;
  }
}

export type WebhookActor = {
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
};

export type WebhookEnvelopePayload = {
  id: string;
  senderEmail: string;
  signerCount: number;
  status: string;
  title: string;
  url: string;
};

export type WebhookPayload = {
  envelope: WebhookEnvelopePayload;
  id: string;
  occurredAt: string;
  test?: true;
  type: WebhookEventType;
};

export type DnsLookup = (
  hostname: string,
) => Promise<Array<{ address: string }>>;

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function uniqueEvents(events: WebhookEventType[]): WebhookEventType[] {
  return webhookEventTypes.filter((event) => events.includes(event));
}

function firstIssueMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Check the highlighted fields.";
}

function clipError(message: string) {
  return message.length > MAX_ERROR_LENGTH
    ? message.slice(0, MAX_ERROR_LENGTH)
    : message;
}

function generateSigningSecret() {
  return randomBytes(SECRET_BYTES).toString("hex");
}

export function envelopeWebhookUrl(
  envelopeId: string,
  env: EnvSource = process.env,
): string {
  const appUrl = resolveAppUrl(env);

  if (!appUrl) {
    return `/envelopes/${envelopeId}`;
  }

  return new URL(`/envelopes/${envelopeId}`, appUrl).toString();
}

export function buildWebhookPayload(input: {
  envelope: WebhookEnvelopePayload;
  eventId: string;
  eventType: WebhookEventType;
  occurredAt: number;
  test?: boolean;
}): WebhookPayload {
  return {
    envelope: {
      id: input.envelope.id,
      senderEmail: input.envelope.senderEmail,
      signerCount: input.envelope.signerCount,
      status: input.envelope.status,
      title: input.envelope.title,
      url: input.envelope.url,
    },
    id: input.eventId,
    occurredAt: new Date(input.occurredAt * 1000).toISOString(),
    type: input.eventType,
    ...(input.test ? { test: true as const } : {}),
  };
}

export function serializeWebhookPayload(payload: WebhookPayload): string {
  const body: Record<string, unknown> = {
    id: payload.id,
    type: payload.type,
    occurredAt: payload.occurredAt,
  };

  if (payload.test) {
    body.test = true;
  }

  body.envelope = {
    id: payload.envelope.id,
    title: payload.envelope.title,
    status: payload.envelope.status,
    senderEmail: payload.envelope.senderEmail,
    signerCount: payload.envelope.signerCount,
    url: payload.envelope.url,
  };

  return JSON.stringify(body);
}

export function signWebhookBody(
  secret: string,
  timestamp: number,
  rawBody: string,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${rawBody}`)
    .digest("hex");

  return `v1=${digest}`;
}

export function webhookSignatureMatches(
  secret: string,
  timestamp: number,
  rawBody: string,
  signatureHeader: string,
): boolean {
  const expected = signWebhookBody(secret, timestamp, rawBody);
  const presented = Buffer.from(signatureHeader);
  const wanted = Buffer.from(expected);

  return (
    presented.length === wanted.length && timingSafeEqual(presented, wanted)
  );
}

/** Seconds to wait after this many failed attempts before the next try. */
export function webhookRetryDelaySeconds(attemptCount: number): number {
  return Math.min(8, 2 ** Math.max(0, attemptCount - 1)) * DAY_SECONDS;
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

/** URL.hostname keeps brackets around IPv6 literals; Node's APIs do not. */
export function hostnameForNetwork(hostname: string) {
  const host = normalizeHostname(hostname);

  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }

  return host;
}

function isLocalDevelopmentHost(hostname: string) {
  const host = hostnameForNetwork(hostname);

  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * The hostname the POST connects as (for TLS) and the addresses it may
 * resolve to. Delivery uses this lookup, not a second DNS answer.
 */
export function webhookRequestTarget(
  url: URL,
  connectAddresses: string[],
): { connectAddresses: string[]; hostHeader: string; hostname: string } {
  return {
    connectAddresses,
    hostHeader: url.host,
    hostname: hostnameForNetwork(url.hostname),
  };
}

/**
 * A socket lookup that answers only with the checked addresses. Node calls it
 * with `all: true` for hostname connections (autoSelectFamily), so it must
 * return the full list in that case and a single address otherwise.
 */
export function lookupPinnedAddresses(addresses: string[]): LookupFunction {
  return (hostname, options, callback) => {
    const wantedFamily =
      typeof options === "object" &&
      options !== null &&
      "family" in options &&
      (options.family === 4 || options.family === 6)
        ? options.family
        : 0;
    const wantsAll =
      typeof options === "object" && options !== null && options.all === true;
    const matches = addresses.filter(
      (address) => wantedFamily === 0 || isIP(address) === wantedFamily,
    );
    const candidates = matches.length > 0 ? matches : addresses;

    if (candidates.length === 0) {
      callback(
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), {
          code: "ENOTFOUND",
        }),
        "",
        0,
      );
      return;
    }

    if (wantsAll) {
      (
        callback as unknown as (
          error: NodeJS.ErrnoException | null,
          addresses: Array<{ address: string; family: number }>,
        ) => void
      )(
        null,
        candidates.map((address) => ({ address, family: isIP(address) })),
      );
      return;
    }

    const match = candidates[0] as string;

    callback(null, match, isIP(match));
  };
}

function ipv4MappedAddress(address: string): string | null {
  const lower = address.toLowerCase();

  if (!lower.startsWith("::ffff:")) {
    return null;
  }

  const rest = lower.slice(7);

  if (isIP(rest) === 4) {
    return rest;
  }

  const parts = rest.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const high = Number.parseInt(parts[0] ?? "", 16);
  const low = Number.parseInt(parts[1] ?? "", 16);

  if (!Number.isInteger(high) || !Number.isInteger(low)) {
    return null;
  }

  return `${String((high >> 8) & 255)}.${String(high & 255)}.${String((low >> 8) & 255)}.${String(low & 255)}`;
}

export function isBlockedWebhookAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return blockedIpv4.check(address, "ipv4");
  }

  if (version === 6) {
    const mapped = ipv4MappedAddress(address);

    if (mapped) {
      return blockedIpv4.check(mapped, "ipv4");
    }

    return blockedIpv6.check(address, "ipv6");
  }

  return true;
}

async function defaultLookup(hostname: string) {
  const host = hostnameForNetwork(hostname);

  if (isIP(host)) {
    return [{ address: host }];
  }

  return lookup(host, { all: true, verbatim: true });
}

type WebhookDestination = {
  addresses: string[];
  localDevelopment: boolean;
  url: URL;
};

/**
 * HTTPS only, except http://localhost (and loopback) when the app is not in
 * production. Hosts that resolve to loopback, private, link-local or
 * metadata addresses are refused. Delivery uses these addresses for the
 * connection, so the POST cannot resolve to a different host.
 */
export async function resolveWebhookDestination(
  rawUrl: string,
  {
    env = process.env,
    lookupAddresses = defaultLookup,
  }: { env?: EnvSource; lookupAddresses?: DnsLookup } = {},
): Promise<WebhookDestination> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new WebhooksError("Enter a valid URL.", 400);
  }

  if (parsed.username || parsed.password) {
    throw new WebhooksError(
      "That address cannot be used as a webhook URL.",
      400,
    );
  }

  const hostname = hostnameForNetwork(parsed.hostname);
  const localDevelopment =
    !isProduction(env) && isLocalDevelopmentHost(hostname);

  if (METADATA_HOSTS.has(hostname)) {
    throw new WebhooksError(
      "That address cannot be used as a webhook URL.",
      400,
    );
  }

  if (
    isIP(hostname) !== 0 &&
    isBlockedWebhookAddress(hostname) &&
    !localDevelopment
  ) {
    throw new WebhooksError(
      "That address cannot be used as a webhook URL.",
      400,
    );
  }

  if (parsed.protocol === "http:") {
    if (!localDevelopment) {
      throw new WebhooksError(
        isProduction(env) && isLocalDevelopmentHost(hostname)
          ? "http://localhost is only allowed while this site is not in production."
          : "Webhook URLs must use HTTPS.",
        400,
      );
    }
  } else if (parsed.protocol !== "https:") {
    throw new WebhooksError("Webhook URLs must use HTTPS.", 400);
  }

  if (localDevelopment) {
    return {
      addresses: isIP(hostname) !== 0 ? [hostname] : [],
      localDevelopment: true,
      url: parsed,
    };
  }

  let records: Array<{ address: string }>;

  try {
    records = await lookupAddresses(hostname);
  } catch {
    throw new WebhooksError(
      "That address cannot be used as a webhook URL.",
      400,
    );
  }

  const addresses = records.map((record) => record.address);

  if (addresses.length === 0) {
    throw new WebhooksError(
      "That address cannot be used as a webhook URL.",
      400,
    );
  }

  for (const address of addresses) {
    if (isBlockedWebhookAddress(address)) {
      throw new WebhooksError(
        "That address cannot be used as a webhook URL.",
        400,
      );
    }
  }

  return { addresses, localDevelopment: false, url: parsed };
}

export async function assertWebhookUrlAllowed(
  rawUrl: string,
  options?: { env?: EnvSource; lookupAddresses?: DnsLookup },
): Promise<URL> {
  return (await resolveWebhookDestination(rawUrl, options)).url;
}

type EndpointRow = {
  createdAt: number;
  description: string | null;
  enabled: boolean;
  events: string[];
  id: string;
  secret: string;
  updatedAt: number;
  url: string;
};

type DeliveryRow = {
  attemptCount: number;
  claimedUntil: number | null;
  createdAt: number;
  endpointId: string;
  eventId: string;
  eventType: string;
  id: string;
  lastAttemptAt: number | null;
  lastError: string | null;
  lastStatusCode: number | null;
  nextAttemptAt: number;
  payload: WebhookPayload | string | null;
  status: string;
};

const ENDPOINT_COLUMNS = `
  id,
  url,
  description,
  events,
  enabled,
  secret,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const DELIVERY_COLUMNS = `
  id,
  endpoint_id AS "endpointId",
  event_id AS "eventId",
  event_type AS "eventType",
  payload,
  status,
  attempt_count AS "attemptCount",
  next_attempt_at AS "nextAttemptAt",
  last_status_code AS "lastStatusCode",
  last_error AS "lastError",
  last_attempt_at AS "lastAttemptAt",
  claimed_until AS "claimedUntil",
  created_at AS "createdAt"
`;

function asEventType(value: string): WebhookEventType {
  if ((webhookEventTypes as readonly string[]).includes(value)) {
    return value as WebhookEventType;
  }

  throw new WebhooksError("Unknown webhook event.", 500);
}

function asDeliveryStatus(value: string): WebhookDeliveryStatus {
  if (value === "pending" || value === "delivered" || value === "failed") {
    return value;
  }

  throw new WebhooksError("Unknown delivery status.", 500);
}

function payloadFromRow(
  payload: WebhookPayload | string | null,
): WebhookPayload | null {
  if (payload == null) {
    return null;
  }

  if (typeof payload === "string") {
    return JSON.parse(payload) as WebhookPayload;
  }

  return payload;
}

function toDeliveryView(row: DeliveryRow): WebhookDeliveryView {
  return {
    attemptCount: row.attemptCount,
    createdAt: row.createdAt,
    endpointId: row.endpointId,
    eventType: asEventType(row.eventType),
    id: row.id,
    lastAttemptAt: row.lastAttemptAt,
    lastError: row.lastError,
    lastStatusCode: row.lastStatusCode,
    status: asDeliveryStatus(row.status),
  };
}

function toEndpointView(
  row: EndpointRow,
  deliveries: WebhookDeliveryView[],
): WebhookEndpointView {
  return {
    createdAt: row.createdAt,
    deliveries,
    description: row.description,
    enabled: row.enabled,
    events: uniqueEvents(row.events.map(asEventType)),
    id: row.id,
    updatedAt: row.updatedAt,
    url: row.url,
  };
}

async function readEndpoint(
  id: string,
  database: DbExecutor,
): Promise<EndpointRow | null> {
  return queryOne<EndpointRow>(
    database,
    `SELECT ${ENDPOINT_COLUMNS} FROM webhook_endpoints WHERE id = $1`,
    [id],
  );
}

async function readDelivery(
  id: string,
  database: DbExecutor,
): Promise<DeliveryRow | null> {
  return queryOne<DeliveryRow>(
    database,
    `SELECT ${DELIVERY_COLUMNS} FROM webhook_deliveries WHERE id = $1`,
    [id],
  );
}

async function deliveriesForEndpoints(
  endpointIds: string[],
  database: DbExecutor,
): Promise<Map<string, WebhookDeliveryView[]>> {
  const grouped = new Map<string, WebhookDeliveryView[]>();

  if (endpointIds.length === 0) {
    return grouped;
  }

  const rows = await queryMany<DeliveryRow>(
    database,
    `
      SELECT ${DELIVERY_COLUMNS}
      FROM (
        SELECT
          id,
          endpoint_id,
          event_id,
          event_type,
          payload,
          status,
          attempt_count,
          next_attempt_at,
          last_status_code,
          last_error,
          last_attempt_at,
          claimed_until,
          created_at,
          row_number() OVER (
            PARTITION BY endpoint_id
            ORDER BY created_at DESC, id DESC
          ) AS row_number
        FROM webhook_deliveries
        WHERE endpoint_id = ANY($1)
      ) ranked
      WHERE row_number <= $2
    `,
    [endpointIds, MAX_DELIVERIES_PER_ENDPOINT],
  );

  for (const row of rows) {
    const list = grouped.get(row.endpointId) ?? [];

    if (list.length < MAX_DELIVERIES_PER_ENDPOINT) {
      list.push(toDeliveryView(row));
      grouped.set(row.endpointId, list);
    }
  }

  return grouped;
}

async function viewForEndpoint(
  row: EndpointRow,
  database: DbExecutor,
): Promise<WebhookEndpointView> {
  const deliveries = await deliveriesForEndpoints([row.id], database);

  return toEndpointView(row, deliveries.get(row.id) ?? []);
}

async function auditWebhookChange(
  actor: WebhookActor,
  action: string,
  details: Record<string, unknown>,
  database: DbExecutor,
) {
  await recordSystemAuditEvent(
    {
      actorEmail: actor.email,
      actorUserId: actor.userId,
      event: "settings_changed",
      ipAddress: actor.ipAddress ?? null,
      metadata: { changes: { webhooks: { action, ...details } } },
      userAgent: actor.userAgent ?? null,
    },
    database,
  );
}

export async function listWebhookEndpoints(
  database: DbExecutor = getDb(),
): Promise<WebhookEndpointView[]> {
  const rows = await queryMany<EndpointRow>(
    database,
    `SELECT ${ENDPOINT_COLUMNS} FROM webhook_endpoints ORDER BY created_at DESC`,
  );
  const deliveries = await deliveriesForEndpoints(
    rows.map((row) => row.id),
    database,
  );

  return rows.map((row) => toEndpointView(row, deliveries.get(row.id) ?? []));
}

export async function createWebhookEndpoint(
  input: unknown,
  actor: WebhookActor,
  database: DbPool = getDb(),
): Promise<WebhookEndpointCreated> {
  const parsed = webhookEndpointCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new WebhooksError(firstIssueMessage(parsed.error), 400);
  }

  const url = (await assertWebhookUrlAllowed(parsed.data.url)).toString();
  const events = uniqueEvents(parsed.data.events);
  const description = parsed.data.description ?? null;
  const enabled = parsed.data.enabled ?? true;
  const secret = generateSigningSecret();
  const now = unixNow();
  const id = randomUUID();

  await withTransaction(async (tx) => {
    await tx.query(
      `
        INSERT INTO webhook_endpoints (
          id, url, description, events, enabled, secret, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [id, url, description, events, enabled, secret, now, now],
    );
    await auditWebhookChange(
      actor,
      "created",
      { endpointId: id, events, url },
      tx,
    );
  }, database);

  const row = await readEndpoint(id, database);

  if (!row) {
    throw new WebhooksError("The endpoint could not be saved.", 500);
  }

  return { ...(await viewForEndpoint(row, database)), secret };
}

export async function updateWebhookEndpoint(
  id: string,
  input: unknown,
  actor: WebhookActor,
  database: DbPool = getDb(),
): Promise<WebhookEndpointView> {
  const parsed = webhookEndpointPatchSchema.safeParse(input);

  if (!parsed.success) {
    throw new WebhooksError(firstIssueMessage(parsed.error), 400);
  }

  return withTransaction(async (tx) => {
    const existing = await readEndpoint(id, tx);

    if (!existing) {
      throw new WebhooksError("That endpoint was not found.", 404);
    }

    const url =
      parsed.data.url === undefined
        ? existing.url
        : (await assertWebhookUrlAllowed(parsed.data.url)).toString();
    let description = existing.description;
    if (parsed.data.description !== undefined) {
      const trimmed = parsed.data.description?.trim() ?? "";
      description = trimmed.length > 0 ? trimmed : null;
    }
    const events =
      parsed.data.events === undefined
        ? uniqueEvents(existing.events.map(asEventType))
        : uniqueEvents(parsed.data.events);
    const enabled = parsed.data.enabled ?? existing.enabled;
    const now = unixNow();

    await tx.query(
      `
        UPDATE webhook_endpoints
        SET url = $1, description = $2, events = $3, enabled = $4, updated_at = $5
        WHERE id = $6
      `,
      [url, description, events, enabled, now, id],
    );
    await auditWebhookChange(
      actor,
      "updated",
      { enabled, endpointId: id, events, url },
      tx,
    );

    const row = await readEndpoint(id, tx);

    if (!row) {
      throw new WebhooksError("That endpoint was not found.", 404);
    }

    return viewForEndpoint(row, tx);
  }, database);
}

export async function deleteWebhookEndpoint(
  id: string,
  actor: WebhookActor,
  database: DbPool = getDb(),
): Promise<void> {
  await withTransaction(async (tx) => {
    const existing = await readEndpoint(id, tx);

    if (!existing) {
      throw new WebhooksError("That endpoint was not found.", 404);
    }

    await tx.query(`DELETE FROM webhook_endpoints WHERE id = $1`, [id]);
    await auditWebhookChange(
      actor,
      "deleted",
      { endpointId: id, url: existing.url },
      tx,
    );
  }, database);
}

export async function rotateWebhookSecret(
  id: string,
  actor: WebhookActor,
  database: DbPool = getDb(),
): Promise<WebhookEndpointCreated> {
  const secret = generateSigningSecret();
  const now = unixNow();

  return withTransaction(async (tx) => {
    const existing = await readEndpoint(id, tx);

    if (!existing) {
      throw new WebhooksError("That endpoint was not found.", 404);
    }

    await tx.query(
      `
        UPDATE webhook_endpoints
        SET secret = $1, updated_at = $2
        WHERE id = $3
      `,
      [secret, now, id],
    );
    await auditWebhookChange(actor, "rotated", { endpointId: id }, tx);

    const row = await readEndpoint(id, tx);

    if (!row) {
      throw new WebhooksError("That endpoint was not found.", 404);
    }

    return { ...(await viewForEndpoint(row, tx)), secret };
  }, database);
}

type EnvelopeWebhookRow = {
  id: string;
  senderEmail: string;
  signerCount: number;
  status: string;
  title: string;
};

async function insertDeliveries(
  input: {
    envelope: EnvelopeWebhookRow;
    eventId: string;
    eventType: WebhookEventType;
    occurredAt: number;
    test?: boolean;
  },
  endpointIds: string[],
  database: DbExecutor,
): Promise<string[]> {
  if (endpointIds.length === 0) {
    return [];
  }

  const payload = buildWebhookPayload({
    envelope: {
      id: input.envelope.id,
      senderEmail: input.envelope.senderEmail,
      signerCount: input.envelope.signerCount,
      status: input.envelope.status,
      title: input.envelope.title,
      url: envelopeWebhookUrl(input.envelope.id),
    },
    eventId: input.eventId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    test: input.test,
  });
  const now = unixNow();
  const ids: string[] = [];

  for (const endpointId of endpointIds) {
    const inserted = await queryOne<{ id: string }>(
      database,
      `
        INSERT INTO webhook_deliveries (
          id, endpoint_id, event_id, event_type, payload, status,
          attempt_count, next_attempt_at, created_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', 0, $6, $6)
        ON CONFLICT (endpoint_id, event_id) DO NOTHING
        RETURNING id
      `,
      [
        randomUUID(),
        endpointId,
        input.eventId,
        input.eventType,
        serializeWebhookPayload(payload),
        now,
      ],
    );

    if (inserted) {
      ids.push(inserted.id);
    }
  }

  return ids;
}

/** One expiry event per envelope deadline, so a failed notice cannot queue twice. */
export function expiryWebhookEventId(envelopeId: string, expiresAt: number) {
  return `expired:${envelopeId}:${String(expiresAt)}`;
}

async function enqueueEnvelopeWebhookEventInner(
  input: {
    envelopeId: string;
    eventId?: string;
    eventType: WebhookEventType;
    occurredAt?: number;
  },
  database: DbExecutor,
): Promise<string[]> {
  const endpoints = await queryMany<{ id: string }>(
    database,
    `
      SELECT id
      FROM webhook_endpoints
      WHERE enabled = true
        AND $1 = ANY(events)
    `,
    [input.eventType],
  );

  if (endpoints.length === 0) {
    return [];
  }

  const envelope = await queryOne<EnvelopeWebhookRow>(
    database,
    `
      SELECT
        e.id,
        e.title,
        e.status,
        u.email AS "senderEmail",
        (
          SELECT count(*)::int FROM signers s WHERE s.envelope_id = e.id
        ) AS "signerCount"
      FROM envelopes e
      JOIN "user" u ON u.id = e.user_id
      WHERE e.id = $1
    `,
    [input.envelopeId],
  );

  if (!envelope) {
    return [];
  }

  return insertDeliveries(
    {
      envelope,
      eventId: input.eventId ?? randomUUID(),
      eventType: input.eventType,
      occurredAt: input.occurredAt ?? unixNow(),
    },
    endpoints.map((endpoint) => endpoint.id),
    database,
  );
}

async function webhookTablesExist(database: DbExecutor): Promise<boolean> {
  const row = await queryOne<{ ready: boolean }>(
    database,
    `
      SELECT
        to_regclass('public.webhook_endpoints') IS NOT NULL
        AND to_regclass('public.webhook_deliveries') IS NOT NULL AS ready
    `,
  );

  return row?.ready === true;
}

/**
 * Writes a delivery row for every enabled endpoint subscribed to this event.
 * Called inside the same transaction as the envelope's status change.
 *
 * Before the webhook migration has run there is nothing to enqueue. The
 * tables are checked with to_regclass first, which cannot fail, because a
 * failed query would abort the caller's transaction and its COMMIT would
 * then roll back the status change without an error.
 */
export async function enqueueEnvelopeWebhookEvent(
  input: {
    envelopeId: string;
    eventId?: string;
    eventType: WebhookEventType;
    occurredAt?: number;
  },
  database: DbExecutor,
): Promise<string[]> {
  if (!(await webhookTablesExist(database))) {
    return [];
  }

  return enqueueEnvelopeWebhookEventInner(input, database);
}

function deliveryFailureMessage(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "Timed out waiting for the endpoint.";
  }

  if (error instanceof WebhooksError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return clipError(error.message);
  }

  return "The request failed.";
}

/**
 * Settles with `promise`, or rejects with the signal's reason once it aborts.
 * A DNS lookup cannot be cancelled, so this stops waiting for it instead.
 */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason as Error);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason as Error);
    };

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error as Error);
      },
    );
  });
}

/**
 * One deadline covers the DNS lookup and the POST, so a slow resolver
 * cannot hold a delivery open past the timeout.
 */
export async function postSignedWebhook(input: {
  body: string;
  deliveryId: string;
  eventType: WebhookEventType;
  lookupAddresses?: DnsLookup;
  secret: string;
  timeoutMs?: number;
  timestamp: number;
  url: string;
}): Promise<number> {
  const signal = AbortSignal.timeout(
    input.timeoutMs ?? WEBHOOK_DELIVERY_TIMEOUT_MS,
  );
  const destination = await untilAborted(
    resolveWebhookDestination(input.url, {
      lookupAddresses: input.lookupAddresses,
    }),
    signal,
  );
  const target = webhookRequestTarget(destination.url, destination.addresses);
  const headers = {
    "Content-Length": String(Buffer.byteLength(input.body)),
    "Content-Type": "application/json",
    Host: target.hostHeader,
    "SignuDoc-Delivery": input.deliveryId,
    "SignuDoc-Event": input.eventType,
    "SignuDoc-Signature": signWebhookBody(
      input.secret,
      input.timestamp,
      input.body,
    ),
    "SignuDoc-Timestamp": String(input.timestamp),
    "User-Agent": "SignuDoc-Webhooks/1.0",
  };
  const isHttps = destination.url.protocol === "https:";
  const port = destination.url.port
    ? Number(destination.url.port)
    : isHttps
      ? 443
      : 80;

  return new Promise((resolve, reject) => {
    const request = (isHttps ? https : http).request(
      {
        headers,
        hostname: target.hostname,
        lookup:
          target.connectAddresses.length > 0
            ? lookupPinnedAddresses(target.connectAddresses)
            : undefined,
        method: "POST",
        path: `${destination.url.pathname}${destination.url.search}`,
        port,
        setHost: false,
        signal,
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode ?? 0));
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    request.write(input.body);
    request.end();
  });
}

type ClaimedDelivery = {
  attemptCount: number;
  body: string;
  claimedUntil: number;
  deliveryId: string;
  eventType: WebhookEventType;
  secret: string;
  skip: WebhookDeliveryView | null;
  url: string;
};

function skipClaim(locked: DeliveryRow & { url: string }): ClaimedDelivery {
  return {
    attemptCount: locked.attemptCount,
    body: "",
    claimedUntil: 0,
    deliveryId: locked.id,
    eventType: asEventType(locked.eventType),
    secret: "",
    skip: toDeliveryView(locked),
    url: locked.url,
  };
}

async function claimDeliveryAttempt(
  deliveryId: string,
  {
    database,
    dueBy,
    force,
  }: { database: DbPool; dueBy: number; force: boolean },
): Promise<ClaimedDelivery> {
  return withTransaction(async (tx) => {
    const locked = await queryOne<
      DeliveryRow & {
        enabled: boolean;
        secret: string;
        url: string;
      }
    >(
      tx,
      `
        SELECT
          d.id,
          d.endpoint_id AS "endpointId",
          d.event_id AS "eventId",
          d.event_type AS "eventType",
          d.payload,
          d.status,
          d.attempt_count AS "attemptCount",
          d.next_attempt_at AS "nextAttemptAt",
          d.last_status_code AS "lastStatusCode",
          d.last_error AS "lastError",
          d.last_attempt_at AS "lastAttemptAt",
          d.claimed_until AS "claimedUntil",
          d.created_at AS "createdAt",
          e.url,
          e.secret,
          e.enabled
        FROM webhook_deliveries d
        JOIN webhook_endpoints e ON e.id = d.endpoint_id
        WHERE d.id = $1
        FOR UPDATE OF d
      `,
      [deliveryId],
    );

    if (!locked) {
      throw new WebhooksError("That delivery was not found.", 404);
    }

    const now = unixNow();
    const inFlight = locked.claimedUntil != null && locked.claimedUntil > now;

    if (inFlight && force) {
      throw new WebhooksError(
        "That delivery is being sent right now. Try again in a minute.",
        409,
      );
    }

    if (
      inFlight ||
      (!force && locked.status !== "pending") ||
      (!force && !locked.enabled) ||
      (!force && locked.nextAttemptAt > dueBy)
    ) {
      return skipClaim(locked);
    }

    const storedPayload = payloadFromRow(locked.payload);

    if (!storedPayload) {
      if (locked.status !== "pending") {
        return skipClaim(locked);
      }

      const expired = await queryOne<DeliveryRow>(
        tx,
        `
          UPDATE webhook_deliveries
          SET
            status = 'failed',
            last_error = $1,
            last_attempt_at = $2,
            claimed_until = NULL
          WHERE id = $3
            AND status = 'pending'
          RETURNING ${DELIVERY_COLUMNS}
        `,
        [STORED_BODY_EXPIRED_MESSAGE, now, locked.id],
      );

      return skipClaim(expired ? { ...expired, url: locked.url } : locked);
    }

    const eventType = asEventType(locked.eventType);
    const envelope = storedPayload.envelope;
    const body = serializeWebhookPayload(
      buildWebhookPayload({
        envelope: {
          id: envelope.id,
          senderEmail: envelope.senderEmail,
          signerCount: envelope.signerCount,
          status: envelope.status,
          title: envelope.title,
          url: envelope.url || envelopeWebhookUrl(envelope.id),
        },
        eventId: storedPayload.id,
        eventType,
        occurredAt:
          Math.floor(Date.parse(storedPayload.occurredAt) / 1000) || now,
        test: storedPayload.test,
      }),
    );
    const attemptCount = locked.attemptCount + 1;
    const claimedUntil = now + WEBHOOK_CLAIM_LEASE_SECONDS;

    await tx.query(
      `
        UPDATE webhook_deliveries
        SET
          attempt_count = $1,
          last_attempt_at = $2,
          claimed_until = $3
        WHERE id = $4
      `,
      [attemptCount, now, claimedUntil, locked.id],
    );

    return {
      attemptCount,
      body,
      claimedUntil,
      deliveryId: locked.id,
      eventType,
      secret: locked.secret,
      skip: null,
      url: locked.url,
    };
  }, database);
}

async function storeDeliveryAttemptResult(
  claimed: ClaimedDelivery,
  result: {
    delivered: boolean;
    errorMessage: string | null;
    statusCode: number | null;
  },
  database: DbPool,
): Promise<WebhookDeliveryView> {
  const now = unixNow();
  let status: WebhookDeliveryStatus = "pending";
  let nextAttemptAt = now + webhookRetryDelaySeconds(claimed.attemptCount);

  if (result.delivered) {
    status = "delivered";
    nextAttemptAt = now;
  } else if (claimed.attemptCount >= MAX_WEBHOOK_ATTEMPTS) {
    status = "failed";
  }

  const updated = await queryOne<DeliveryRow>(
    database,
    `
      UPDATE webhook_deliveries
      SET
        status = $1,
        next_attempt_at = $2,
        last_status_code = $3,
        last_error = $4,
        last_attempt_at = $5,
        claimed_until = NULL
      WHERE id = $6
        AND attempt_count = $7
        AND claimed_until = $8
      RETURNING ${DELIVERY_COLUMNS}
    `,
    [
      status,
      nextAttemptAt,
      result.statusCode,
      result.errorMessage,
      now,
      claimed.deliveryId,
      claimed.attemptCount,
      claimed.claimedUntil,
    ],
  );

  if (updated) {
    return toDeliveryView(updated);
  }

  const current = await readDelivery(claimed.deliveryId, database);

  if (!current) {
    throw new WebhooksError("That delivery was not found.", 404);
  }

  return toDeliveryView(current);
}

async function attemptOneDelivery(
  deliveryId: string,
  {
    database,
    dueBy = unixNow(),
    force = false,
  }: { database: DbPool; dueBy?: number; force?: boolean },
): Promise<WebhookDeliveryView> {
  const claimed = await claimDeliveryAttempt(deliveryId, {
    database,
    dueBy,
    force,
  });

  if (claimed.skip) {
    return claimed.skip;
  }

  const now = unixNow();
  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let delivered = false;

  try {
    statusCode = await postSignedWebhook({
      body: claimed.body,
      deliveryId: claimed.deliveryId,
      eventType: claimed.eventType,
      secret: claimed.secret,
      timestamp: now,
      url: claimed.url,
    });
    delivered = statusCode >= 200 && statusCode < 300;

    if (!delivered) {
      errorMessage = `The endpoint responded with ${String(statusCode)}.`;
    }
  } catch (error) {
    errorMessage = deliveryFailureMessage(error);
  }

  return storeDeliveryAttemptResult(
    claimed,
    { delivered, errorMessage, statusCode },
    database,
  );
}

export async function attemptWebhookDeliveries(
  deliveryIds: string[],
  {
    database = getDb(),
    force = false,
  }: { database?: DbPool; force?: boolean } = {},
): Promise<WebhookDeliveryView[]> {
  const results: WebhookDeliveryView[] = [];

  for (const deliveryId of deliveryIds) {
    results.push(await attemptOneDelivery(deliveryId, { database, force }));
  }

  return results;
}

export async function attemptWebhookDeliveriesQuietly(
  deliveryIds: string[],
  database?: DbPool,
): Promise<void> {
  if (deliveryIds.length === 0) {
    return;
  }

  const run = async () => {
    try {
      await attemptWebhookDeliveries(deliveryIds, { database });
    } catch (error) {
      if (!isMissingSchemaError(error)) {
        console.error("Webhook delivery failed:", error);
      }
    }
  };

  // Tests wait so they can assert on the POST. A signing request must not:
  // a slow endpoint would block completion, decline, or void.
  if (process.env.NODE_TEST_CONTEXT) {
    await run();
    return;
  }

  try {
    const { after } = await import("next/server");
    after(run);
  } catch {
    await run();
  }
}

export async function retryDueWebhookDeliveries({
  database = getDb(),
  now = unixNow(),
  timeBudgetMs = 60_000,
}: {
  database?: DbPool;
  now?: number;
  timeBudgetMs?: number;
} = {}): Promise<{ attempted: number; delivered: number; failed: number }> {
  const summary = { attempted: 0, delivered: 0, failed: 0 };
  const stopAt = Date.now() + timeBudgetMs;

  try {
    const due = await queryMany<{ id: string }>(
      database,
      `
        SELECT d.id
        FROM webhook_deliveries d
        JOIN webhook_endpoints e ON e.id = d.endpoint_id
        WHERE d.status = 'pending'
          AND d.next_attempt_at <= $1
          AND (d.claimed_until IS NULL OR d.claimed_until < $1)
          AND e.enabled = true
        ORDER BY d.next_attempt_at ASC, d.id ASC
        LIMIT ${RETRY_BATCH_SIZE}
      `,
      [now],
    );

    for (const row of due) {
      if (Date.now() >= stopAt) {
        break;
      }

      const result = await attemptOneDelivery(row.id, {
        database,
        dueBy: now,
      });

      summary.attempted += 1;

      if (result.status === "delivered") {
        summary.delivered += 1;
      }

      if (result.status === "failed") {
        summary.failed += 1;
      }
    }
  } catch (error) {
    if (!isMissingSchemaError(error)) {
      throw error;
    }
  }

  return summary;
}

export async function retryWebhookDelivery(
  deliveryId: string,
  database: DbPool = getDb(),
): Promise<WebhookDeliveryView> {
  const existing = await readDelivery(deliveryId, database);

  if (!existing) {
    throw new WebhooksError("That delivery was not found.", 404);
  }

  return attemptOneDelivery(deliveryId, { database, force: true });
}

export async function sendTestWebhookEvent(
  endpointId: string,
  actor: WebhookActor,
  database: DbPool = getDb(),
): Promise<WebhookDeliveryView> {
  const endpoint = await readEndpoint(endpointId, database);

  if (!endpoint) {
    throw new WebhooksError("That endpoint was not found.", 404);
  }

  const now = unixNow();
  const eventType =
    uniqueEvents(endpoint.events.map(asEventType))[0] ?? "envelope.completed";
  const ids = await insertDeliveries(
    {
      envelope: {
        id: "00000000-0000-0000-0000-000000000000",
        senderEmail: actor.email,
        signerCount: 0,
        status: "completed",
        title: "Test event",
      },
      eventId: randomUUID(),
      eventType,
      occurredAt: now,
      test: true,
    },
    [endpoint.id],
    database,
  );
  const deliveryId = ids[0];

  if (!deliveryId) {
    throw new WebhooksError("The test event could not be created.", 500);
  }

  return attemptOneDelivery(deliveryId, { database, force: true });
}

/**
 * Drops stored delivery bodies older than WEBHOOK_PAYLOAD_RETENTION_DAYS.
 * History rows stay; retries that still needed the body are marked failed.
 */
export async function expireWebhookDeliveryPayloads({
  database = getDb(),
  now = unixNow(),
}: {
  database?: DbExecutor;
  now?: number;
} = {}): Promise<number> {
  if (!(await webhookTablesExist(database))) {
    return 0;
  }

  const cutoff = now - WEBHOOK_PAYLOAD_RETENTION_DAYS * DAY_SECONDS;
  const result = await database.query(
    `
      UPDATE webhook_deliveries
      SET
        payload = NULL,
        status = CASE WHEN status = 'pending' THEN 'failed' ELSE status END,
        last_error = CASE
          WHEN status = 'pending' THEN $2
          ELSE last_error
        END,
        claimed_until = NULL
      WHERE payload IS NOT NULL
        AND created_at < $1
    `,
    [cutoff, STORED_BODY_EXPIRED_MESSAGE],
  );

  return result.rowCount ?? 0;
}
