import { getDb } from "@/lib/db/connection";
import { createDownloadResponse } from "@/lib/download-response";
import {
  DownloadAccessError,
  getSenderEnvelopeDownload,
} from "@/lib/downloads";
import { apiError, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ id: string; type: string }> };

const FILE_TYPES = {
  // The signed, sealed PDF.
  signed: "signed",
  // The audit certificate (evidence) PDF.
  certificate: "evidence",
} as const;

/** GET /api/v1/documents/:id/files/signed or /files/certificate. */
export async function GET(request: Request, context: Context) {
  const { id, type } = await context.params;

  return runApiRoute(
    request,
    { category: "document_file", limit: 120 },
    async ({ principal }) => {
      const fileType = FILE_TYPES[type as keyof typeof FILE_TYPES];

      if (!fileType) {
        return apiError("Ask for files/signed or files/certificate.", 404);
      }

      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return apiError("Document not found.", 404);
      }

      try {
        return await createDownloadResponse(
          await getSenderEnvelopeDownload(principal.user.id, id, fileType, {
            database: getDb(),
          }),
        );
      } catch (error) {
        if (error instanceof DownloadAccessError) {
          return apiError(error.message, error.statusCode);
        }

        throw error;
      }
    },
  );
}
