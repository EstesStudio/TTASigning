import {
  BrandLogoError,
  isCompletePng,
  sniffLogoContentType,
} from "./brand-logo.ts";
import { getDb, queryOne, type DbExecutor } from "./db/connection.ts";
import { MAX_DRAWN_SIGNATURE_BYTES } from "./schemas/field.ts";

// Offered only on documents sent to the account's own confirmed address; applied as a drawn signature.

export class SavedSignatureError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SavedSignatureError";
    this.statusCode = statusCode;
  }
}

const PNG_DATA_URL = /^data:image\/png;base64,([a-z0-9+/=\s]+)$/i;

/** The PNG in a data URL, checked as an uploaded signature must be. */
export function parseSignatureDataUrl(dataUrl: unknown): Uint8Array {
  const match =
    typeof dataUrl === "string" ? dataUrl.trim().match(PNG_DATA_URL) : null;

  if (!match?.[1]) {
    throw new SavedSignatureError("The signature must be a PNG image.");
  }

  const bytes = new Uint8Array(
    Buffer.from(match[1].replace(/\s+/g, ""), "base64"),
  );

  if (bytes.length === 0) {
    throw new SavedSignatureError("Choose a signature image.");
  }

  if (bytes.length > MAX_DRAWN_SIGNATURE_BYTES) {
    throw new SavedSignatureError("The signature image is too large.", 413);
  }

  let complete = false;

  try {
    complete =
      sniffLogoContentType(bytes) === "image/png" && isCompletePng(bytes);
  } catch (error) {
    if (!(error instanceof BrandLogoError)) {
      throw error;
    }
  }

  if (!complete) {
    throw new SavedSignatureError(
      "This image is damaged or incomplete. Choose another file.",
    );
  }

  return bytes;
}

export function toSignatureDataUrl(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function saveSignature(
  userId: string,
  dataUrl: unknown,
  database: DbExecutor = getDb(),
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  const bytes = parseSignatureDataUrl(dataUrl);

  await database.query(
    `
      insert into public.saved_signatures (user_id, image, updated_at)
      values ($1, $2, $3)
      on conflict (user_id) do update set
        image = excluded.image,
        updated_at = excluded.updated_at
    `,
    [userId, Buffer.from(bytes), now],
  );
}

export async function removeSignature(
  userId: string,
  database: DbExecutor = getDb(),
): Promise<void> {
  await database.query(
    `delete from public.saved_signatures where user_id = $1`,
    [userId],
  );
}

/** The account's saved signature as a data URL, or null when it has none. */
export async function readSignature(
  userId: string,
  database: DbExecutor = getDb(),
): Promise<string | null> {
  const row = await queryOne<{ image: Buffer }>(
    database,
    `select image from public.saved_signatures where user_id = $1`,
    [userId],
  );

  return row ? toSignatureDataUrl(new Uint8Array(row.image)) : null;
}

type SessionUser = { email: string; emailVerified: boolean; id: string };

/** Whether this account is the signer: their confirmed address is the signer's. */
export function isSignerAccount(
  user: SessionUser | null | undefined,
  signerEmail: string,
): user is SessionUser {
  return Boolean(
    user?.emailVerified &&
    user.email.trim().toLowerCase() === signerEmail.trim().toLowerCase(),
  );
}
