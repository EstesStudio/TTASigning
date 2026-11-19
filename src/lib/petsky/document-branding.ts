import { createHash } from "node:crypto";

import { z } from "zod";

import { normalizeBrandColor } from "../brand-color.ts";
import { checkLogoUpload } from "../brand-logo.ts";
import type { Branding } from "../branding.ts";
import { type DbExecutor, queryOne } from "../db/connection.ts";
import { hashOpaqueToken } from "../services/opaque-tokens.ts";
import {
  createStorageService,
  type StorageService,
} from "../services/storage.ts";

/**
 * PetskySign: the business a document comes from (a pet care house), shown
 * to its signer in place of the install's name, logo and color. Given by the
 * API when the document is sent and stored on the envelope as it was then.
 */

export const documentBrandingSchema = z.object({
  /** Shown as who sent the document, in the header and in the consent text. */
  name: z.string().trim().min(1).max(120),
  /** "#rrggbb". */
  color: z.string().trim().max(20).optional(),
  /** Email address or phone number for the consent text. */
  contact: z.string().trim().min(1).max(200).optional(),
  /** PNG, JPEG or WebP, at most 512 KB. */
  logo: z.object({ contentBase64: z.string().min(1).max(800_000) }).optional(),
});

export type DocumentBrandingInput = z.infer<typeof documentBrandingSchema>;

export type StoredDocumentBranding = {
  color: string | null;
  contact: string | null;
  deliveryChannel: "email" | "link";
  envelopeId: string;
  logoKey: string | null;
  name: string | null;
};

const LOGO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export class DocumentBrandingError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "DocumentBrandingError";
  }
}

/**
 * Checks the branding and stores its logo. Returns the columns to write on
 * the envelope. Logos are kept by content hash, so a house's logo is stored
 * once however many documents carry it.
 */
export async function prepareDocumentBranding(
  input: DocumentBrandingInput,
  storageService: StorageService = createStorageService(),
): Promise<{
  brandColor: string | null;
  brandContact: string | null;
  brandLogoKey: string | null;
  brandName: string;
}> {
  let brandColor: string | null = null;

  if (input.color) {
    brandColor = normalizeBrandColor(input.color);

    if (!brandColor) {
      throw new DocumentBrandingError(
        "branding.color must be a color like #1f7a5a.",
      );
    }
  }

  let brandLogoKey: string | null = null;

  if (input.logo) {
    const bytes = new Uint8Array(
      Buffer.from(input.logo.contentBase64, "base64"),
    );
    let contentType: keyof typeof LOGO_EXTENSIONS;

    try {
      contentType = checkLogoUpload(bytes);
    } catch (error) {
      throw new DocumentBrandingError(
        error instanceof Error
          ? `branding.logo: ${error.message}`
          : "Bad logo.",
      );
    }

    const hash = createHash("sha256").update(bytes).digest("hex");

    brandLogoKey = `document-logos/${hash}.${LOGO_EXTENSIONS[contentType]}`;
    await storageService.putObject({
      body: bytes,
      contentType,
      keepExisting: true,
      key: brandLogoKey,
    });
  }

  return {
    brandColor,
    brandContact: input.contact ?? null,
    brandLogoKey,
    brandName: input.name,
  };
}

const SELECT_BRANDING = `
  SELECT
    e.id AS "envelopeId",
    e.brand_name AS name,
    e.brand_color AS color,
    e.brand_logo_key AS "logoKey",
    e.brand_contact AS contact,
    e.delivery_channel AS "deliveryChannel"
  FROM envelopes e
`;

export async function getDocumentBranding(
  envelopeId: string,
  database: DbExecutor,
): Promise<StoredDocumentBranding | null> {
  if (!z.string().uuid().safeParse(envelopeId).success) {
    return null;
  }

  return queryOne<StoredDocumentBranding>(
    database,
    `${SELECT_BRANDING} WHERE e.id = $1`,
    [envelopeId],
  );
}

/**
 * The branding of the document a signing link belongs to, for the pages
 * shown when the link no longer works (expired, voided...). A link that was
 * replaced or used up finds nothing, and the install's branding is shown.
 */
export async function getDocumentBrandingForToken(
  token: string,
  database: DbExecutor,
): Promise<StoredDocumentBranding | null> {
  if (!token || token.length > 200) {
    return null;
  }

  return queryOne<StoredDocumentBranding>(
    database,
    `${SELECT_BRANDING}
      JOIN signers s ON s.envelope_id = e.id
      WHERE s.signing_token_hash = $1
      LIMIT 1`,
    [hashOpaqueToken(token)],
  );
}

export function documentLogoPath(envelopeId: string): string {
  return `/api/brand/document-logo/${encodeURIComponent(envelopeId)}`;
}

/** The install's branding with the document's business laid over it. */
export function applyDocumentBranding(
  base: Branding,
  document: StoredDocumentBranding | null,
): Branding {
  if (!document?.name) {
    return base;
  }

  return {
    ...base,
    brandColor: document.color ?? base.brandColor,
    // The business's own logo, or none: the install's logo would name
    // someone other than the business that sent the document.
    logoUrl: document.logoKey ? documentLogoPath(document.envelopeId) : null,
    productName: document.name,
    supportAddress: document.contact ?? base.supportAddress,
  };
}
