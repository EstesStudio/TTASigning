import { getDb } from "@/lib/db/connection";
import { cancelApiDocument } from "@/lib/petsky/api-documents";
import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ id: string }> };

/** Voids the document: its link stops accepting signatures. Idempotent. */
export async function POST(request: Request, context: Context) {
  const { id } = await context.params;

  return runApiRoute(
    request,
    { category: "document_cancel", limit: 30, windowMs: 10 * 60 * 1000 },
    async ({ context: requestContext, principal }) => {
      const body = (await request.json().catch(() => null)) as {
        reason?: unknown;
      } | null;
      const reason =
        typeof body?.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 500)
          : null;

      return apiJson(
        await cancelApiDocument(principal, id, reason, requestContext, getDb()),
      );
    },
  );
}
