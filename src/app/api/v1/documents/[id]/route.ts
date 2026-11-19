import { getDb } from "@/lib/db/connection";
import { getApiDocument } from "@/lib/petsky/api-documents";
import { eraseDocuments } from "@/lib/petsky/companies";
import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ id: string }> };

/** The document's status and its signer's progress. */
export async function GET(request: Request, context: Context) {
  const { id } = await context.params;

  return runApiRoute(
    request,
    { category: "document_read", limit: 600 },
    async ({ principal }) =>
      apiJson(await getApiDocument(principal, id, getDb())),
  );
}

/**
 * Permanently deletes the document: file, signer data and audit trail. For
 * a person's erasure request (LGPD). Cannot be undone.
 */
export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;

  return runApiRoute(
    request,
    { category: "document_erase", limit: 30, windowMs: 10 * 60 * 1000 },
    async ({ context: requestContext, principal }) =>
      apiJson(
        await eraseDocuments(
          principal,
          { documentId: id },
          requestContext,
          getDb(),
        ),
      ),
  );
}
