import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { listPeople } from "@/lib/people";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { localize } from "@/lib/i18n/server-locale";

// The accounts on this install, for the People list in Settings.
// Administrators only. `search` narrows the list to the accounts whose name
// or email address contains it.

export async function GET(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  try {
    const search = new URL(request.url).searchParams.get("search") ?? "";

    return NextResponse.json(
      { ...(await listPeople({ search })), you: sessionResult.user.id },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    logRouteError(error, {
      category: "people_list_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while listing accounts.",
      path: getRequestPathname(request),
      userId: sessionResult.user.id,
    });

    return NextResponse.json(
      { error: await localize((m) => m.admin.people.listNotLoaded) },
      { status: 500 },
    );
  }
}
