import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type { DbExecutor } from "../db/connection.ts";

/**
 * API keys for the integration API (/api/v1). A key acts as the account it
 * belongs to: what it sends shows on that account's dashboard and follows the
 * same rules as a send from the browser. Only the SHA-256 of a key is stored;
 * the key itself is shown once, when it is made.
 */

export const API_KEY_PREFIX = "psk_";
const KEY_BYTES = 32;
/** How often last_used_at is written, so every call does not write a row. */
const LAST_USED_RESOLUTION_SECONDS = 60;

export type ApiKeyPrincipal = {
  keyId: string;
  keyName: string;
  user: {
    email: string;
    id: string;
    name: string;
  };
};

export type CreatedApiKey = {
  id: string;
  key: string;
  name: string;
  prefix: string;
};

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string } {
  const key = `${API_KEY_PREFIX}${randomBytes(KEY_BYTES).toString("base64url")}`;

  return { key, prefix: key.slice(0, API_KEY_PREFIX.length + 6) };
}

/** The key in an `Authorization: Bearer psk_...` header, or null. */
export function readBearerApiKey(headers: Headers): string | null {
  const header = headers.get("authorization")?.trim();

  if (!header) {
    return null;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const key = match?.[1];

  if (!key?.startsWith(API_KEY_PREFIX) || key.length > 200) {
    return null;
  }

  return key;
}

export async function createApiKey(
  input: { name: string; userId: string },
  database: DbExecutor,
): Promise<CreatedApiKey> {
  const { key, prefix } = generateApiKey();
  const id = randomUUID();

  await database.query(
    `
      INSERT INTO api_keys (id, user_id, name, prefix, key_hash)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, input.userId, input.name.trim(), prefix, hashApiKey(key)],
  );

  return { id, key, name: input.name.trim(), prefix };
}

export async function revokeApiKey(
  id: string,
  database: DbExecutor,
): Promise<boolean> {
  const result = await database.query(
    `
      UPDATE api_keys
      SET revoked_at = extract(epoch from now())::bigint
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [id],
  );

  return result.rowCount === 1;
}

type ApiKeyRow = {
  email: string;
  emailVerified: boolean;
  keyHash: string;
  keyId: string;
  keyName: string;
  lastUsedAt: number | null;
  name: string;
  userId: string;
};

/**
 * The account a key acts as, or null for a key that is unknown, revoked, or
 * whose account cannot send (its email is not verified).
 */
export async function authenticateApiKey(
  key: string,
  database: DbExecutor,
  now = Math.floor(Date.now() / 1000),
): Promise<ApiKeyPrincipal | null> {
  const keyHash = hashApiKey(key);
  const result = await database.query<ApiKeyRow>(
    `
      SELECT
        k.id AS "keyId",
        k.name AS "keyName",
        k.key_hash AS "keyHash",
        k.last_used_at AS "lastUsedAt",
        u.id AS "userId",
        u.email,
        u.name,
        u."emailVerified" AS "emailVerified"
      FROM api_keys k
      JOIN "user" u ON u.id = k.user_id
      WHERE k.key_hash = $1
        AND k.revoked_at IS NULL
    `,
    [keyHash],
  );
  const row = result.rows[0];

  // The lookup is by hash already; the comparison is constant-time anyway,
  // so nothing about a near miss can be learned from timing.
  if (
    !row ||
    !timingSafeEqual(Buffer.from(row.keyHash), Buffer.from(keyHash)) ||
    row.emailVerified !== true
  ) {
    return null;
  }

  if (
    row.lastUsedAt === null ||
    now - row.lastUsedAt >= LAST_USED_RESOLUTION_SECONDS
  ) {
    await database.query(
      `UPDATE api_keys SET last_used_at = $1 WHERE id = $2`,
      [now, row.keyId],
    );
  }

  return {
    keyId: row.keyId,
    keyName: row.keyName,
    user: {
      email: row.email,
      id: row.userId,
      name: row.name?.trim() || row.email,
    },
  };
}
