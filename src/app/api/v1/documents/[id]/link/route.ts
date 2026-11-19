import { getDb } from "@/lib/db/connection";
import { issueNewSigningLink } from "@/lib/petsky/api-documents";
import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ id: string }> };

/**
 * A new signing link for the signer whose turn it is. The previous link stops
 * working. Nothing is emailed: pass the link on yourself.
 */
export async function POST(request: Request, context: Context) {
  const { id } = await context.params;

  return runApiRoute(
    request,
    { category: "document_link", limit: 30, windowMs: 10 * 60 * 1000 },
    async ({ context: requestContext, principal }) =>
      apiJson(
        await issueNewSigningLink(principal, id, requestContext, getDb()),
      ),
  );
}
