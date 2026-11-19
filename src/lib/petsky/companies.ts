import { z } from "zod";

import { type DbPool, queryMany } from "../db/connection.ts";
import {
  buildEnvelopeStorageKeys,
  deleteStorageKeys,
  deleteThumbnailStoredMeanwhile,
  listFieldImagesForEnvelopeIds,
} from "../retention.ts";
import {
  createStorageService,
  type StorageService,
} from "../services/storage.ts";
import { recordSystemAuditEvent } from "../services/system-audit.ts";
import { ApiDocumentError, type RequestContext } from "./api-documents.ts";
import type { ApiKeyPrincipal } from "./api-keys.ts";

/**
 * PetskySign: documents by business (the `companyRef` the API is given):
 * listing, usage and erasure. Everything is scoped to the API key's account,
 * so one account never sees another's documents, whatever refs it passes.
 */

export const companyRefSchema = z.string().trim().min(1).max(200);

type DocumentStatus =
  "completed" | "declined" | "draft" | "expired" | "sent" | "voided";

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export const listDocumentsQuerySchema = z.object({
  companyRef: companyRefSchema.optional(),
  externalRef: z.string().trim().min(1).max(200).optional(),
  status: z
    .enum(["completed", "declined", "draft", "expired", "sent", "voided"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** The `nextCursor` of the previous page. */
  cursor: z.string().trim().max(200).optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

type ListRow = {
  companyRef: string | null;
  completedAt: number | null;
  createdAt: number;
  declinedAt: number | null;
  expiresAt: number | null;
  externalRef: string | null;
  id: string;
  sentAt: number | null;
  status: Exclude<DocumentStatus, "expired">;
  title: string;
  voidedAt: number | null;
};

function iso(timestamp: number | null): string | null {
  return timestamp === null ? null : new Date(timestamp * 1000).toISOString();
}

function encodeCursor(row: Pick<ListRow, "createdAt" | "id">): string {
  return Buffer.from(`${row.createdAt}:${row.id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: number; id: string } {
  const [createdAt, id] = Buffer.from(cursor, "base64url")
    .toString("utf8")
    .split(":");
  const parsed = Number(createdAt);

  if (!Number.isInteger(parsed) || !id) {
    throw new ApiDocumentError("Invalid cursor.", 400);
  }

  return { createdAt: parsed, id };
}

/** Newest first, a page at a time. */
export async function listApiDocuments(
  principal: ApiKeyPrincipal,
  query: ListDocumentsQuery,
  database: DbPool,
  now = Math.floor(Date.now() / 1000),
) {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const conditions = ["user_id = $1"];
  const values: unknown[] = [principal.user.id];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  };

  if (query.companyRef) add("company_ref = ?", query.companyRef);
  if (query.externalRef) add("external_ref = ?", query.externalRef);

  if (query.status === "expired") {
    conditions.push("status = 'sent'");
    add("expires_at <= ?", now);
  } else if (query.status === "sent") {
    conditions.push("status = 'sent'");
    add("(expires_at IS NULL OR expires_at > ?)", now);
  } else if (query.status) {
    add("status = ?", query.status);
  }

  if (cursor) {
    values.push(cursor.createdAt, cursor.id);
    conditions.push(
      `(created_at, id) < ($${values.length - 1}, $${values.length})`,
    );
  }

  values.push(query.limit + 1);

  const rows = await queryMany<ListRow>(
    database,
    `
      SELECT
        id,
        title,
        status,
        external_ref AS "externalRef",
        company_ref AS "companyRef",
        created_at AS "createdAt",
        sent_at AS "sentAt",
        completed_at AS "completedAt",
        declined_at AS "declinedAt",
        voided_at AS "voidedAt",
        expires_at AS "expiresAt"
      FROM envelopes
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC, id DESC
      LIMIT $${values.length}
    `,
    values,
  );
  const page = rows.slice(0, query.limit);
  const last = page[page.length - 1];

  return {
    documents: page.map((row) => ({
      companyRef: row.companyRef,
      completedAt: iso(row.completedAt),
      createdAt: iso(row.createdAt)!,
      declinedAt: iso(row.declinedAt),
      documentId: row.id,
      expiresAt: iso(row.expiresAt),
      externalRef: row.externalRef,
      sentAt: iso(row.sentAt),
      status: (row.status === "sent" &&
      row.expiresAt !== null &&
      row.expiresAt <= now
        ? "expired"
        : row.status) as DocumentStatus,
      title: row.title,
      voidedAt: iso(row.voidedAt),
    })),
    nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
  };
}

// ---------------------------------------------------------------------------
// Daily limit
// ---------------------------------------------------------------------------

/**
 * Documents the business has had created in the last `windowSeconds`. A send
 * that failed leaves nothing behind (its draft is deleted), so failures never
 * count against the business's limit.
 */
export async function countRecentCompanyDocuments(
  principal: ApiKeyPrincipal,
  companyRef: string,
  windowSeconds: number,
  database: DbPool,
  now = Math.floor(Date.now() / 1000),
): Promise<number> {
  const [row] = await queryMany<{ count: number }>(
    database,
    `
      SELECT count(*)::int AS count
      FROM envelopes
      WHERE user_id = $1
        AND company_ref = $2
        AND created_at > $3
    `,
    [principal.user.id, companyRef, now - windowSeconds],
  );

  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export const usageQuerySchema = z.object({
  /** ISO date or date-time. Defaults to the start of the current month (UTC). */
  from: z.string().trim().max(40).optional(),
  /** ISO date or date-time, exclusive. Defaults to now. */
  to: z.string().trim().max(40).optional(),
});

function parseInstant(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new ApiDocumentError(`Not a date: ${value}`, 400);
  }

  return Math.floor(parsed / 1000);
}

/**
 * How many documents a business sent in a period, and where those stand
 * now. For billing and for seeing a business's activity.
 */
export async function getCompanyUsage(
  principal: ApiKeyPrincipal,
  companyRef: string,
  query: z.infer<typeof usageQuerySchema>,
  database: DbPool,
  now = Math.floor(Date.now() / 1000),
) {
  const startOfMonth = Math.floor(
    Date.UTC(
      new Date(now * 1000).getUTCFullYear(),
      new Date(now * 1000).getUTCMonth(),
      1,
    ) / 1000,
  );
  const from = parseInstant(query.from, startOfMonth);
  const to = parseInstant(query.to, now + 1);

  if (to <= from) {
    throw new ApiDocumentError("`to` must be after `from`.", 400);
  }

  const rows = await queryMany<{ count: number; status: string }>(
    database,
    `
      SELECT
        CASE
          WHEN status = 'sent' AND expires_at IS NOT NULL AND expires_at <= $5
            THEN 'expired'
          ELSE status
        END AS status,
        count(*)::int AS count
      FROM envelopes
      WHERE user_id = $1
        AND company_ref = $2
        AND sent_at >= $3
        AND sent_at < $4
      GROUP BY 1
    `,
    [principal.user.id, companyRef, from, to, now],
  );
  const byStatus: Record<string, number> = {
    completed: 0,
    declined: 0,
    expired: 0,
    sent: 0,
    voided: 0,
  };

  for (const row of rows) {
    byStatus[row.status] = row.count;
  }

  return {
    byStatus,
    companyRef,
    from: iso(from),
    sent: rows.reduce((total, row) => total + row.count, 0),
    to: iso(to),
  };
}

// ---------------------------------------------------------------------------
// Erasure
// ---------------------------------------------------------------------------

type ErasableRow = {
  evidenceKey: string | null;
  id: string;
  signedPdfKey: string | null;
  sourcePdfKey: string;
  status: "completed" | "declined" | "draft" | "sent" | "voided";
  updatedAt: number;
  userId: string;
};

export type ErasureResult = {
  deleted: number;
  documentIds: string[];
  failed: string[];
};

/**
 * Permanently deletes documents, with their files, signer data and audit
 * trail: a business that leaves, or a person's erasure request under the
 * LGPD. Signing links stop working at once. This destroys the evidence of
 * the agreements, so the caller decides when it is allowed (petsky asks the
 * business to confirm). The erasure itself is recorded in the system audit
 * trail, with the ids that were deleted and no personal data.
 */
export async function eraseDocuments(
  principal: ApiKeyPrincipal,
  target: { companyRef: string } | { documentId: string },
  context: RequestContext,
  database: DbPool,
  storageService: StorageService = createStorageService(),
): Promise<ErasureResult> {
  const byCompany = "companyRef" in target;

  if (!byCompany && !z.string().uuid().safeParse(target.documentId).success) {
    throw new ApiDocumentError("Document not found.", 404);
  }

  const envelopes = await queryMany<ErasableRow>(
    database,
    `
      SELECT
        id,
        user_id AS "userId",
        status,
        source_pdf_key AS "sourcePdfKey",
        signed_pdf_key AS "signedPdfKey",
        evidence_key AS "evidenceKey",
        updated_at AS "updatedAt"
      FROM envelopes
      WHERE user_id = $1
        AND ${byCompany ? "company_ref" : "id"} = $2
      ORDER BY created_at
    `,
    [principal.user.id, byCompany ? target.companyRef : target.documentId],
  );

  if (!byCompany && envelopes.length === 0) {
    throw new ApiDocumentError("Document not found.", 404);
  }

  const images = await listFieldImagesForEnvelopeIds(
    envelopes.map((envelope) => envelope.id),
    database,
  );
  const result: ErasureResult = { deleted: 0, documentIds: [], failed: [] };

  for (const envelope of envelopes) {
    try {
      // Files first, as the retention sweep does: if storage fails, the row
      // stays, the document is reported as failed, and asking again retries
      // it. Nothing is ever left on disk without a row that points to it.
      await deleteStorageKeys(
        buildEnvelopeStorageKeys(envelope, images.get(envelope.id) ?? []),
        storageService,
      );

      const deleted = await database.query(
        `DELETE FROM envelopes WHERE id = $1 AND user_id = $2`,
        [envelope.id, principal.user.id],
      );

      if (deleted.rowCount !== 1) {
        continue;
      }

      result.deleted += 1;
      result.documentIds.push(envelope.id);
      await deleteThumbnailStoredMeanwhile(envelope, storageService);
    } catch (error) {
      result.failed.push(envelope.id);
      console.error(
        `[erasure] Failed to erase envelope ${envelope.id}:`,
        error,
      );
    }
  }

  if (result.deleted > 0 || result.failed.length > 0) {
    await recordSystemAuditEvent(
      {
        actorEmail: principal.user.email,
        actorUserId: principal.user.id,
        event: "documents_erased",
        ipAddress: context.ipAddress,
        metadata: {
          apiKeyId: principal.keyId,
          ...(byCompany ? { companyRef: target.companyRef } : {}),
          deleted: result.deleted,
          documentIds: result.documentIds,
          failed: result.failed,
        },
        userAgent: context.userAgent,
      },
      database,
    );
  }

  return result;
}
