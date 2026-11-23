import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";

import { readBearerToken, type ApiKeyScope } from "../api-keys.ts";
import type { ApiContext } from "../api/route.ts";
import { createSignuDocMcpServer } from "./server.ts";

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return Response.json({ error: { code, message } }, { headers, status });
}

/** The MCP endpoint accepts one deliberately narrow, draft-only credential. */
export function validateMcpRequest(
  request: Request,
  scope: ApiKeyScope,
  appUrl: string,
): Response | null {
  if (!readBearerToken(request.headers)) {
    return errorResponse(
      401,
      "unauthorized",
      'Send a valid API key as "Authorization: Bearer sdk_…".',
      { "www-authenticate": 'Bearer realm="signudoc"' },
    );
  }

  let publicUrl: URL;

  try {
    publicUrl = new URL(appUrl);
  } catch {
    return errorResponse(
      503,
      "service_unavailable",
      "The public app URL is not configured for MCP requests.",
    );
  }

  const hostRejected = hostHeaderValidationResponse(request, [
    publicUrl.hostname,
  ]);

  if (hostRejected) {
    return hostRejected;
  }

  const origin = request.headers.get("origin");

  if (origin !== null) {
    const originRejected = originValidationResponse(request, [
      publicUrl.hostname,
    ]);

    if (originRejected) {
      return originRejected;
    }

    try {
      if (new URL(origin).origin !== publicUrl.origin) {
        return errorResponse(403, "forbidden", "Origin is not allowed.");
      }
    } catch {
      return errorResponse(403, "forbidden", "Origin is not allowed.");
    }
  }

  if (scope !== "prepare") {
    return errorResponse(
      403,
      "forbidden",
      "The MCP endpoint requires an API key with prepare access.",
    );
  }

  return null;
}

/** Handle one authenticated, origin-checked MCP HTTP exchange statelessly. */
export async function handleMcpRequest(
  request: Request,
  context: ApiContext,
  appUrl: string,
): Promise<Response> {
  const rejected = validateMcpRequest(request, context.actor.scope, appUrl);

  if (rejected) {
    return rejected;
  }

  const handler = createMcpHandler(() => createSignuDocMcpServer(context));

  return handler.fetch(request);
}
