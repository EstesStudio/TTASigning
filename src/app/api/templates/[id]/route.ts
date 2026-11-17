import { NextResponse } from "next/server";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { deleteTemplate, TemplateError } from "@/lib/templates";
import { localize } from "@/lib/i18n/server-locale";

type TemplateRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: TemplateRouteContext) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;

  try {
    await deleteTemplate(session.user.id, id, { database: getDb() });

    return NextResponse.json({ deletedTemplateId: id }, { status: 200 });
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: await localize(error) },
        { status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_delete_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while deleting a template.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: await localize((m) => m.template.api.unableToDelete) },
      { status: 500 },
    );
  }
}
