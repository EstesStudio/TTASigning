import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import {
  BrandLogoError,
  MAX_LOGO_BYTES,
  removeBrandLogo,
  saveBrandLogo,
} from "@/lib/brand-logo";
import { buildBrandLogoPath } from "@/lib/branding";
import { logRouteError } from "@/lib/security/logging";
import { recordAdminActivity } from "@/lib/services/admin-activity";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { isHostedMode } from "@/lib/utils/env";
import { readLimitedBody } from "@/lib/utils/limited-body";
import { localize } from "@/lib/i18n/server-locale";

// The install's logo, set from the Organization tab in Settings.
// Administrators only. The image is the request body itself.

const privateNoStore = { "cache-control": "private, no-store" };

async function authorize(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  // The hosted service runs under its own name and mark.
  if (isHostedMode()) {
    return NextResponse.json(
      { error: await localize((m) => m.admin.logo.notOwnLogo) },
      { headers: privateNoStore, status: 409 },
    );
  }

  const rateLimitResponse = await applyRateLimit({
    category: "brand_logo_update",
    key: buildRateLimitKey(["brand-logo", sessionResult.user.id]),
    limit: 30,
    request,
    userId: sessionResult.user.id,
    windowMs: 10 * 60 * 1000,
  });

  return rateLimitResponse ?? sessionResult;
}

export async function PUT(request: Request) {
  const session = await authorize(request);

  if (session instanceof Response) {
    return session;
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(declaredLength) && declaredLength > MAX_LOGO_BYTES) {
    return NextResponse.json(
      { error: await localize((m) => m.admin.logo.tooLarge) },
      { headers: privateNoStore, status: 413 },
    );
  }

  try {
    const body = await readLimitedBody(request, MAX_LOGO_BYTES);

    if (!body) {
      return NextResponse.json(
        { error: await localize((m) => m.admin.logo.tooLarge) },
        { headers: privateNoStore, status: 413 },
      );
    }

    const version = await saveBrandLogo(body);

    await recordAdminActivity({
      event: "logo_changed",
      metadata: { action: "replaced", version },
      request,
      user: session.user,
    });

    return NextResponse.json(
      { logoUrl: buildBrandLogoPath(version) },
      { headers: privateNoStore },
    );
  } catch (error) {
    if (error instanceof BrandLogoError) {
      return NextResponse.json(
        { error: await localize(error) },
        { headers: privateNoStore, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "brand_logo_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while saving the logo.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: await localize((m) => m.admin.logo.notSaved) },
      { headers: privateNoStore, status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await authorize(request);

  if (session instanceof Response) {
    return session;
  }

  try {
    await removeBrandLogo();
    await recordAdminActivity({
      event: "logo_changed",
      metadata: { action: "removed" },
      request,
      user: session.user,
    });

    return NextResponse.json({ logoUrl: null }, { headers: privateNoStore });
  } catch (error) {
    logRouteError(error, {
      category: "brand_logo_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while removing the logo.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: await localize((m) => m.admin.logo.notRemoved) },
      { headers: privateNoStore, status: 500 },
    );
  }
}
