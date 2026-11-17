import { NextResponse } from "next/server";

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
  sendTestWebhookEvent,
  WebhooksError,
  type WebhookActor,
} from "@/lib/webhooks";

const noStore = { "cache-control": "private, no-store" };

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;
  const rateLimitResponse = await applyRateLimit({
    category: "webhook_test_event",
    key: buildRateLimitKey(["webhook-test", session.user.id]),
    limit: 20,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const actor: WebhookActor = {
    email: session.user.email,
    ipAddress: getClientIpAddress(request.headers),
    userAgent: getRequestUserAgent(request.headers),
    userId: session.user.id,
  };

  try {
    const delivery = await sendTestWebhookEvent(id, actor);

    return NextResponse.json({ delivery }, { headers: noStore });
  } catch (error) {
    if (error instanceof WebhooksError) {
      return NextResponse.json(
        { error: error.message },
        { headers: noStore, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "webhook_test_event_failure",
      ipAddress: actor.ipAddress,
      message: "Unexpected failure while sending a test webhook.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "The test event could not be sent." },
      { headers: noStore, status: 500 },
    );
  }
}
