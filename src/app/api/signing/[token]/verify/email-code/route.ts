import { NextResponse } from "next/server";

import { getDb } from "@/lib/db/connection";
import { localize } from "@/lib/i18n/server-locale";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress } from "@/lib/security/request";
import {
  SigningAccessError,
  SigningMutationError,
  sendSignerEmailCode,
} from "@/lib/signing";

type EmailCodeRouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const NO_STORE = { "cache-control": "private, no-store" };

export async function POST(request: Request, context: EmailCodeRouteContext) {
  const { token } = await context.params;
  const rateLimitResponse = await applyRateLimit({
    category: "signing_email_code",
    key: buildRateLimitKey(["signing-email-code", token]),
    limit: 5,
    message: (m) => m.signing.tooManyCodes,
    request,
    windowMs: 60 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    return NextResponse.json(
      await sendSignerEmailCode(token, { database: getDb() }),
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof SigningMutationError) {
      return NextResponse.json(
        { error: await localize(error) },
        { headers: NO_STORE, status: error.statusCode },
      );
    }

    if (error instanceof SigningAccessError) {
      return NextResponse.json(
        { error: await localize(error), state: error.state },
        { headers: NO_STORE, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "signing_email_code_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while sending a signer code.",
      path: request.url,
    });

    return NextResponse.json(
      { error: await localize((m) => m.signing.codeNotSent) },
      { headers: NO_STORE, status: 500 },
    );
  }
}
