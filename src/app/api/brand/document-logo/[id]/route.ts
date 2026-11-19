import { getDb } from "@/lib/db/connection";
import { getDocumentBranding } from "@/lib/petsky/document-branding";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import {
  createStorageService,
  StorageObjectNotFoundError,
} from "@/lib/services/storage";

// PetskySign: the logo of the business a document comes from, shown to its
// signer. Public like the install's logo; stored by content hash, so the
// answer for a document never changes and can be cached for a long time.

type Context = { params: Promise<{ id: string }> };

const DAY_SECONDS = 24 * 60 * 60;

function notFound() {
  return new Response(null, {
    headers: { "cache-control": "public, max-age=60" },
    status: 404,
  });
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;

  try {
    const branding = await getDocumentBranding(id, getDb());

    if (!branding?.logoKey) {
      return notFound();
    }

    const logo = await createStorageService().getObject(branding.logoKey);

    return new Response(Buffer.from(logo.body), {
      headers: {
        "cache-control": `public, max-age=${DAY_SECONDS}`,
        "content-disposition": "inline",
        "content-length": String(logo.body.byteLength),
        "content-security-policy": "default-src 'none'; sandbox",
        "content-type": logo.contentType ?? "image/png",
        "cross-origin-resource-policy": "cross-origin",
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof StorageObjectNotFoundError) {
      return notFound();
    }

    logRouteError(error, {
      category: "document_logo_read_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading a document's logo.",
      path: getRequestPathname(request),
    });

    return new Response(null, { status: 500 });
  }
}
