import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import {
  getClientIpAddress,
  getRequestPathname,
  getRequestUserAgent,
} from "@/lib/security/request";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  WebhooksError,
  type WebhookActor,
} from "@/lib/webhooks";

const noStore = { "cache-control": "private, no-store" };

function actorFrom(
  session: { user: { email: string; id: string } },
  request: Request,
): WebhookActor {
  return {
    email: session.user.email,
    ipAddress: getClientIpAddress(request.headers),
    userAgent: getRequestUserAgent(request.headers),
    userId: session.user.id,
  };
}

function errorResponse(error: unknown, request: Request, userId: string) {
  if (error instanceof WebhooksError) {
    return NextResponse.json(
      { error: error.message },
      { headers: noStore, status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Check the highlighted fields." },
      { headers: noStore, status: 400 },
    );
  }

  logRouteError(error, {
    category: "webhook_endpoint_failure",
    ipAddress: getClientIpAddress(request.headers),
    message: "Unexpected failure while managing webhook endpoints.",
    path: getRequestPathname(request),
    userId,
  });

  return NextResponse.json(
    { error: "That change could not be saved." },
    { headers: noStore, status: 500 },
  );
}

// The webhook endpoints in Settings. Administrators only.
export async function GET(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  try {
    return NextResponse.json(
      { endpoints: await listWebhookEndpoints() },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error, request, sessionResult.user.id);
  }
}

export async function POST(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "webhook_endpoint_create",
    key: buildRateLimitKey(["webhook-create", session.user.id]),
    limit: 30,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body: unknown = await request.json().catch(() => null);

  try {
    const endpoint = await createWebhookEndpoint(
      body ?? {},
      actorFrom(session, request),
    );

    return NextResponse.json({ endpoint }, { headers: noStore, status: 201 });
  } catch (error) {
    return errorResponse(error, request, session.user.id);
  }
}
