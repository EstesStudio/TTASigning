import { NextResponse } from "next/server";

import { getAuthSessionFromHeaders } from "./server.ts";
import { localize } from "../i18n/server-locale.ts";
import { logSecurityEvent } from "../security/logging.ts";
import { getSettings } from "../settings.ts";
import { needsTwoFactorSetup } from "../sign-in-security.ts";
import { getClientIpAddress, getRequestPathname } from "../security/request.ts";

export async function requireVerifiedSenderSession(request: Request) {
  const session = await getAuthSessionFromHeaders(request.headers);

  if (!session) {
    return NextResponse.json(
      { error: await localize((m) => m.account.unauthorized) },
      { status: 401 },
    );
  }

  if (session.user.emailVerified === true) {
    if (await needsTwoFactorSetup(await getSettings(), session.user)) {
      return NextResponse.json(
        { error: await localize((m) => m.auth.setUpTwoFactorFirst) },
        { status: 403 },
      );
    }

    return session;
  }

  logSecurityEvent("warn", {
    category: "email_verification_required",
    ipAddress: getClientIpAddress(request.headers),
    message: "Blocked an authenticated sender action for an unverified user.",
    path: getRequestPathname(request),
    userId: session.user.id,
  });

  return NextResponse.json(
    {
      error: await localize((m) => m.auth.verifyEmailFirst),
    },
    { status: 403 },
  );
}
