import { getDb } from "@/lib/db/connection";
import { companyRefSchema, eraseDocuments } from "@/lib/petsky/companies";
import { apiError, apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ companyRef: string }> };

/**
 * DELETE /api/v1/companies/:companyRef/documents
 * body: { "confirm": "<the same companyRef>" }
 *
 * Permanently deletes every document of the business: files, signer data
 * and audit trails. For a business that leaves petsky. Cannot be undone.
 */
export async function DELETE(request: Request, context: Context) {
  const { companyRef: rawRef } = await context.params;

  return runApiRoute(
    request,
    { category: "company_erase", limit: 5, windowMs: 60 * 60 * 1000 },
    async ({ context: requestContext, principal }) => {
      const companyRef = companyRefSchema.parse(decodeURIComponent(rawRef));
      const body = (await request.json().catch(() => null)) as {
        confirm?: unknown;
      } | null;

      if (body?.confirm !== companyRef) {
        return apiError(
          'Confirm by sending { "confirm": "<companyRef>" } with the same companyRef.',
          400,
        );
      }

      return apiJson(
        await eraseDocuments(
          principal,
          { companyRef },
          requestContext,
          getDb(),
        ),
      );
    },
  );
}
