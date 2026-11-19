import { getDb } from "@/lib/db/connection";
import { remindApiDocument } from "@/lib/petsky/api-documents";
import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ id: string }> };

/**
 * Reminds the signer: by email on the email channel; on the link channel a
 * new link is returned for you to pass on.
 */
export async function POST(request: Request, context: Context) {
  const { id } = await context.params;

  return runApiRoute(
    request,
    { category: "document_remind", limit: 30, windowMs: 10 * 60 * 1000 },
    async ({ context: requestContext, principal }) =>
      apiJson(await remindApiDocument(principal, id, requestContext, getDb())),
  );
}
