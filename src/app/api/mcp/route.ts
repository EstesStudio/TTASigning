import { apiError } from "@/lib/api/http";
import { handleApi } from "@/lib/api/route";
import { handleMcpRequest } from "@/lib/mcp/http";
import { resolveAppUrl } from "@/lib/utils/env";

async function handle(request: Request): Promise<Response> {
  return handleApi(request, "prepare", "api_mcp_failure", async (context) => {
    if (context.actor.scope !== "prepare") {
      return apiError(
        403,
        "forbidden",
        "The MCP endpoint requires an API key with prepare access.",
      );
    }

    const appUrl = resolveAppUrl();

    if (!appUrl) {
      return apiError(
        503,
          "internal_error",
        "The public app URL is not configured for MCP requests.",
      );
    }

    return handleMcpRequest(request, context, appUrl);
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
