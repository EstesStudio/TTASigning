import { NextResponse } from "next/server";

import { deliverDueWebhooks } from "@/lib/petsky/webhook-delivery";
import { identifyRetentionCaller } from "@/lib/retention-job";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";

// PetskySign: sends the webhook deliveries that are due, including retries.
// Deliveries also go out right after the event that makes them; this is for
// the ones that failed or were missed. Call it every minute (Coolify
// scheduled task). It takes the same secret as the daily job: with
// CRON_SECRET or RETENTION_JOB_SECRET set, only a caller presenting one gets
// in, and gets the summary back. With neither, anyone may call it: it only
// sends what is due, and answers 204.

async function handle(request: Request) {
  const caller = identifyRetentionCaller(request.headers.get("authorization"));

  if (caller === "denied") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await deliverDueWebhooks({ limit: 100 });

    return caller === "authorized"
      ? NextResponse.json(summary, {
          headers: { "cache-control": "private, no-store" },
        })
      : new NextResponse(null, { status: 204 });
  } catch (error) {
    logRouteError(error, {
      category: "webhook_job_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "The webhook delivery job failed.",
      path: getRequestPathname(request),
    });

    return new NextResponse(null, { status: 500 });
  }
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
