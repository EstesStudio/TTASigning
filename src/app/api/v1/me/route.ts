import { apiJson } from "@/lib/api/http";
import { handleApi } from "@/lib/api/route";

// Which key this is and whom it acts as. The simplest way to check that a
// key works.
export async function GET(request: Request) {
  return handleApi(
    request,
    "read",
    "api_me_failure",
    async ({ actor, apiKey }) =>
      apiJson({
        key: {
          id: apiKey.id,
          name: apiKey.name,
          scope: apiKey.scope,
        },
        user: {
          email: actor.email,
          id: actor.userId,
          name: actor.name,
        },
      }),
  );
}
