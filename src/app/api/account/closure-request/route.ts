import { NextResponse } from "next/server";

import { getAuthSessionFromHeaders } from "@/lib/auth/server";
import { AccountMutationError, requestAccountClosure } from "@/lib/account";
import { getDb } from "@/lib/db/connection";
import { localizeFieldErrors } from "@/lib/i18n/field-errors";
import { localize } from "@/lib/i18n/server-locale";

export async function POST(request: Request) {
  const session = await getAuthSessionFromHeaders(request.headers);

  if (!session) {
    return NextResponse.json(
      { error: await localize((m) => m.account.unauthorized) },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  try {
    const result = await requestAccountClosure(
      session.user.id,
      {
        confirmation: String(payload?.confirmation ?? ""),
      },
      {
        database: getDb(),
      },
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AccountMutationError) {
      return NextResponse.json(
        {
          error: await localize(error),
          fieldErrors: await localizeFieldErrors(error.userFieldErrors),
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        error: await localize((m) => m.account.unableToSubmitClosure),
      },
      { status: 500 },
    );
  }
}
