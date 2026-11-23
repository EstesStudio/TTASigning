import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/admin";
import {
  checkGraphPermissions,
  clearGraphSettings,
  GraphSettingsError,
  resolveGraphConfig,
  saveGraphSettings,
  type GraphSettingsChanges,
} from "@/lib/email-graph-settings";
import { getEmailStatus } from "@/lib/email-status";
import { sendTestEmail } from "@/lib/email-test";
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
import { resolveEmailDriver } from "@/lib/services/email";
import { recordSystemAuditEvent } from "@/lib/services/system-audit";

// Microsoft 365 credentials in Settings, Organization, Email setup, for
// EMAIL_DRIVER=graph. Administrators only. See email-graph-settings.ts.

type AdminSession = Exclude<
  Awaited<ReturnType<typeof requireAdminSession>>,
  Response
>;

async function view() {
  const graph = await resolveGraphConfig();

  return {
    fromEnv: graph.fromEnv,
    missing: graph.missing,
    secretUnreadable: graph.secretUnreadable,
    values: graph.values,
  };
}

function graphDriverInUse(): boolean {
  try {
    return resolveEmailDriver() === "graph";
  } catch {
    return false;
  }
}

async function guard(request: Request): Promise<AdminSession | Response> {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  if (!graphDriverInUse()) {
    return NextResponse.json(
      { error: "Set EMAIL_DRIVER=graph to send email through Microsoft 365." },
      { status: 409 },
    );
  }

  return sessionResult;
}

async function rateLimited(request: Request, session: AdminSession) {
  return applyRateLimit({
    category: "email_setup_action",
    key: buildRateLimitKey(["email-setup", session.user.id]),
    limit: 20,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });
}

function failure(request: Request, error: unknown, userId: string) {
  logRouteError(error, {
    category: "email_setup_failure",
    ipAddress: getClientIpAddress(request.headers),
    message: "Unexpected failure while setting up Microsoft 365 email.",
    path: getRequestPathname(request),
    userId,
  });

  return NextResponse.json(
    {
      error: "The Microsoft 365 settings could not be saved. Please try again.",
    },
    { status: 500 },
  );
}

async function audit(
  request: Request,
  session: AdminSession,
  changes: GraphSettingsChanges,
) {
  if (Object.keys(changes).length === 0) {
    return;
  }

  await recordSystemAuditEvent({
    actorEmail: session.user.email,
    actorUserId: session.user.id,
    event: "settings_changed",
    ipAddress: getClientIpAddress(request.headers),
    metadata: { changes },
    userAgent: getRequestUserAgent(request.headers),
  });
}

export async function GET(request: Request) {
  const session = await guard(request);

  if (session instanceof Response) {
    return session;
  }

  try {
    return NextResponse.json({ settings: await view() });
  } catch (error) {
    return failure(request, error, session.user.id);
  }
}

export async function PUT(request: Request) {
  const session = await guard(request);

  if (session instanceof Response) {
    return session;
  }

  const limited = await rateLimited(request, session);

  if (limited) {
    return limited;
  }

  const body: unknown = await request.json().catch(() => null);

  try {
    await audit(request, session, await saveGraphSettings(body ?? {}));

    return NextResponse.json({
      settings: await view(),
      status: await getEmailStatus(),
    });
  } catch (error) {
    if (error instanceof GraphSettingsError) {
      return NextResponse.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    return failure(request, error, session.user.id);
  }
}

export async function DELETE(request: Request) {
  const session = await guard(request);

  if (session instanceof Response) {
    return session;
  }

  const limited = await rateLimited(request, session);

  if (limited) {
    return limited;
  }

  try {
    await audit(request, session, await clearGraphSettings());

    return NextResponse.json({
      settings: await view(),
      status: await getEmailStatus(),
    });
  } catch (error) {
    return failure(request, error, session.user.id);
  }
}

const verifySchema = z.object({ action: z.literal("verify") });

/**
 * Verify connection: signs in as the app, reads what it was granted, then
 * sends the administrator a test email from the mailbox.
 */
export async function POST(request: Request) {
  const session = await guard(request);

  if (session instanceof Response) {
    return session;
  }

  const limited = await rateLimited(request, session);

  if (limited) {
    return limited;
  }

  if (!verifySchema.safeParse(await request.json().catch(() => null)).success) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  try {
    const permissions = await checkGraphPermissions();
    const test = permissions.signedIn
      ? await sendTestEmail({ name: session.user.name, to: session.user.email })
      : null;

    return NextResponse.json({
      permissions,
      status: await getEmailStatus(),
      test,
    });
  } catch (error) {
    return failure(request, error, session.user.id);
  }
}
