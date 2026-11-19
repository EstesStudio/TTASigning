import { NextResponse } from "next/server";

import { getDb } from "../db/connection.ts";
import { logRouteError, logSecurityEvent } from "../security/logging.ts";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "../security/route-controls.ts";
import {
  getClientIpAddress,
  getRequestPathname,
  getRequestUserAgent,
} from "../security/request.ts";
import { describeApiError, type RequestContext } from "./api-documents.ts";
import {
  authenticateApiKey,
  readBearerApiKey,
  type ApiKeyPrincipal,
} from "./api-keys.ts";

const NO_STORE = { "cache-control": "private, no-store" };

export function apiJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { headers: NO_STORE, status });
}

export function apiError(message: string, status: number): NextResponse {
  return apiJson({ error: message }, status);
}

type ApiHandler = (input: {
  context: RequestContext;
  principal: ApiKeyPrincipal;
}) => Promise<Response>;

type ApiRouteOptions = {
  /** Category for logs and the rate limit. */
  category: string;
  /** Requests a key may make per window. */
  limit?: number;
  windowMs?: number;
};

/**
 * Runs an /api/v1 handler: checks the API key, applies a per-key rate limit,
 * and turns the known errors into JSON responses. Every response is
 * private and not cached.
 */
export async function runApiRoute(
  request: Request,
  { category, limit = 120, windowMs = 60 * 1000 }: ApiRouteOptions,
  handler: ApiHandler,
): Promise<Response> {
  const ipAddress = getClientIpAddress(request.headers);
  const key = readBearerApiKey(request.headers);
  const database = getDb();
  const principal = key ? await authenticateApiKey(key, database) : null;

  if (!principal) {
    logSecurityEvent("warn", {
      category: "api_key_rejected",
      ipAddress,
      message: key
        ? "Rejected an unknown or revoked API key."
        : "API request without a bearer API key.",
      path: getRequestPathname(request),
    });

    return apiError("Invalid or missing API key.", 401);
  }

  const rateLimitResponse = await applyRateLimit({
    category: `api_${category}`,
    key: buildRateLimitKey(["api", category, principal.keyId]),
    limit,
    request,
    userId: principal.user.id,
    windowMs,
  });

  if (rateLimitResponse) {
    rateLimitResponse.headers.set("cache-control", "private, no-store");
    return rateLimitResponse;
  }

  try {
    return await handler({
      context: {
        ipAddress,
        userAgent: getRequestUserAgent(request.headers),
      },
      principal,
    });
  } catch (error) {
    const known = describeApiError(error);

    if (known) {
      return apiError(known.message, known.status);
    }

    logRouteError(error, {
      category: `api_${category}_failure`,
      ipAddress,
      message: `Unexpected failure in the integration API (${category}).`,
      path: getRequestPathname(request),
      userId: principal.user.id,
    });

    return apiError("Something went wrong. Try again.", 500);
  }
}
