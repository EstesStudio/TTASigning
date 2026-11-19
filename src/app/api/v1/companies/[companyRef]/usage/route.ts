import { getDb } from "@/lib/db/connection";
import {
  companyRefSchema,
  getCompanyUsage,
  usageQuerySchema,
} from "@/lib/petsky/companies";
import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

type Context = { params: Promise<{ companyRef: string }> };

/**
 * GET /api/v1/companies/:companyRef/usage?from=&to=
 * Documents the business sent in the period (default: this month, UTC) and
 * where they stand now.
 */
export async function GET(request: Request, context: Context) {
  const { companyRef } = await context.params;

  return runApiRoute(
    request,
    { category: "company_usage" },
    async ({ principal }) => {
      const url = new URL(request.url);
      const query = usageQuerySchema.parse({
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      });

      return apiJson(
        await getCompanyUsage(
          principal,
          companyRefSchema.parse(companyRef),
          query,
          getDb(),
        ),
      );
    },
  );
}
