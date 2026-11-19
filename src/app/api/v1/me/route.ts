import { apiJson, runApiRoute } from "@/lib/petsky/api-route";

// Who the API key acts as. Useful to check a key and the connection.
export async function GET(request: Request) {
  return runApiRoute(request, { category: "me" }, async ({ principal }) =>
    apiJson({
      account: { email: principal.user.email, name: principal.user.name },
      key: { id: principal.keyId, name: principal.keyName },
    }),
  );
}
