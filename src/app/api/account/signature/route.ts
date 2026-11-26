import { NextResponse } from "next/server";

import { getAuthSessionFromHeaders } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { MAX_DRAWN_SIGNATURE_BYTES } from "@/lib/schemas/field";
import { readLimitedBody } from "@/lib/utils/limited-body";
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

  // Base64 grows the image by a third; 4 KB covers the data URL prefix and JSON.
  const body = await readLimitedBody(
    request,
    Math.ceil(MAX_DRAWN_SIGNATURE_BYTES / 3) * 4 + 4096,
  );

  if (!body) {
    return NextResponse.json(
      { error: "The signature image is too large." },
      { status: 413 },
    );
  }

  let payload: { imageDataUrl?: unknown } | null = null;

  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    payload = null;
  }

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
