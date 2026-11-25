import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { getDb, withTransaction } from "@/lib/db/connection";
import { getEmailStatus } from "@/lib/email-status";
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
import { recordSystemAuditEvent } from "@/lib/services/system-audit";
import {
  applySmtpSettingsUpdate,
  parseSmtpSettingsUpdate,
  readStoredSmtpSettings,
  saveSmtpSettings,
  SmtpSettingsError,
  toSmtpSettingsView,
} from "@/lib/smtp-settings";

// The SMTP server on the Organization tab in Settings, for an install that
// sends with EMAIL_DRIVER=smtp. Administrators only. The saved password is
// never sent back.

export async function GET(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  try {
    return NextResponse.json({
      smtp: toSmtpSettingsView(process.env, await readStoredSmtpSettings()),
    });
  } catch (error) {
    logRouteError(error, {
      category: "smtp_settings_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while reading the SMTP settings.",
      path: getRequestPathname(request),
      userId: sessionResult.user.id,
    });

    return NextResponse.json(
      { error: "The SMTP settings could not be read." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "smtp_settings_update",
    key: buildRateLimitKey(["smtp-settings", session.user.id]),
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
    const update = parseSmtpSettingsUpdate(body ?? {}, process.env);

    // The change and its line in the install's audit trail land together.
    await withTransaction(async (tx) => {
      await tx.query(`SELECT id FROM app_settings WHERE id FOR UPDATE`);

      const { changes, next } = applySmtpSettingsUpdate(
        await readStoredSmtpSettings(tx),
        update,
        process.env,
      );

      if (Object.keys(changes).length === 0) {
        return;
      }

      await saveSmtpSettings(next, tx);
      await recordSystemAuditEvent(
        {
          actorEmail: session.user.email,
          actorUserId: session.user.id,
          event: "settings_changed",
          ipAddress: getClientIpAddress(request.headers),
          metadata: { changes },
          userAgent: getRequestUserAgent(request.headers),
        },
        tx,
      );
    }, getDb());

    return NextResponse.json({
      smtp: toSmtpSettingsView(process.env, await readStoredSmtpSettings()),
      status: await getEmailStatus(),
    });
  } catch (error) {
    if (error instanceof SmtpSettingsError) {
      return NextResponse.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }

    logRouteError(error, {
      category: "smtp_settings_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while saving the SMTP settings.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "The SMTP settings could not be saved." },
      { status: 500 },
    );
  }
}
