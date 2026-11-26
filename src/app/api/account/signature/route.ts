import { NextResponse } from "next/server";

import { getAuthSessionFromHeaders } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import {
  SavedSignatureError,
  removeSignature,
  saveSignature,
} from "@/lib/saved-signature";

export async function PUT(request: Request) {
  const session = await getAuthSessionFromHeaders(request.headers);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    imageDataUrl?: unknown;
  } | null;

  try {
    await saveSignature(session.user.id, payload?.imageDataUrl, getDb());
  } catch (error) {
    if (error instanceof SavedSignatureError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to save your signature." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const session = await getAuthSessionFromHeaders(request.headers);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await removeSignature(session.user.id, getDb());

  return new NextResponse(null, { status: 204 });
}
