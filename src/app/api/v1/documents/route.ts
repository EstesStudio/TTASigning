import { getDb } from "@/lib/db/connection";
import {
  createApiDocument,
  createApiDocumentSchema,
} from "@/lib/petsky/api-documents";
import { apiError, apiJson, runApiRoute } from "@/lib/petsky/api-route";

/** Larger PDFs are refused before they are read. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

type SourceFile = {
  body: Uint8Array;
  contentType: string | null;
  filename: string;
};

/**
 * Creates a document with one signer and sends it at once.
 *
 * multipart/form-data with two parts:
 *   file  the PDF
 *   data  JSON: { title, signer: { name, email?, channel }, fields?,
 *         expiresInDays?, externalRef?, companyRef?,
 *         permittedUseConfirmed: true }
 *
 * or application/json with the same object plus
 *   file: { filename, contentBase64 }
 *
 * Returns 201 { documentId, signerId, signLink, status, expiresAt }.
 * signLink is set on the link channel only.
 */
export async function POST(request: Request) {
  return runApiRoute(
    request,
    { category: "document_create", limit: 60, windowMs: 10 * 60 * 1000 },
    async ({ context, principal }) => {
      const read = await readRequest(request);

      if (read instanceof Response) {
        return read;
      }

      const input = createApiDocumentSchema.parse(read.data);
      const created = await createApiDocument(
        principal,
        input,
        read.file,
        context,
        getDb(),
      );

      return apiJson(
        {
          ...created,
          expiresAt:
            created.expiresAt === null
              ? null
              : new Date(created.expiresAt * 1000).toISOString(),
        },
        201,
      );
    },
  );
}

async function readRequest(
  request: Request,
): Promise<{ data: unknown; file: SourceFile } | Response> {
  const declaredLength = Number(request.headers.get("content-length"));

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_FILE_BYTES * 1.4
  ) {
    return apiError("The file is too large.", 413);
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const data = form?.get("data");

    if (!(file instanceof File)) {
      return apiError("Send the PDF in a part named file.", 400);
    }

    if (typeof data !== "string") {
      return apiError("Send the details as JSON in a part named data.", 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      return apiError("The file is too large.", 413);
    }

    const parsed = parseJson(data);

    if (parsed === undefined) {
      return apiError("The data part is not valid JSON.", 400);
    }

    return {
      data: parsed,
      file: {
        body: new Uint8Array(await file.arrayBuffer()),
        contentType: file.type || "application/pdf",
        filename: file.name || "documento.pdf",
      },
    };
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => undefined)) as
      { file?: { contentBase64?: unknown; filename?: unknown } } | undefined;
    const encoded = body?.file?.contentBase64;
    const filename = body?.file?.filename;

    if (!body || typeof encoded !== "string" || typeof filename !== "string") {
      return apiError(
        "Send file: { filename, contentBase64 } with the details.",
        400,
      );
    }

    const bytes = Buffer.from(encoded, "base64");

    if (bytes.byteLength > MAX_FILE_BYTES) {
      return apiError("The file is too large.", 413);
    }

    const data: Record<string, unknown> = { ...body };

    delete data.file;

    return {
      data,
      file: {
        body: new Uint8Array(bytes),
        contentType: "application/pdf",
        filename: filename.trim() || "documento.pdf",
      },
    };
  }

  return apiError(
    "Send multipart/form-data (file + data) or application/json.",
    415,
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
