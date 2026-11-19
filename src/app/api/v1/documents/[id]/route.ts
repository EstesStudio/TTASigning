import { getDb } from "@/lib/db/connection";
import { getApiDocument } from "@/lib/petsky/api-documents";
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
