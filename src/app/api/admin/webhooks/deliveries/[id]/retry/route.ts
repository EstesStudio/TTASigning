import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { retryWebhookDelivery, WebhooksError } from "@/lib/webhooks";

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
    category: "webhook_delivery_retry",
    key: buildRateLimitKey(["webhook-retry", session.user.id]),
    limit: 30,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const delivery = await retryWebhookDelivery(id);

    return NextResponse.json({ delivery }, { headers: noStore });
  } catch (error) {
    if (error instanceof WebhooksError) {
      return NextResponse.json(
        { error: error.message },
        { headers: noStore, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "webhook_delivery_retry_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while sending a webhook again.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "That delivery could not be sent again." },
      { headers: noStore, status: 500 },
    );
  }
}
