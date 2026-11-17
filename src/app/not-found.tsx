import { connection } from "next/server";

import { BrandingProvider } from "@/components/layout/branding-provider";
import { loadBranding } from "@/components/layout/public-document-shell";
import { NotFoundShell } from "@/components/not-found/not-found-shell";

// Outside the layouts that hand branding down, so it looks up the
// install's name and language itself.
export default async function NotFound() {
  await connection();

  return (
    <BrandingProvider branding={await loadBranding()}>
      <NotFoundShell initialState="default" />
    </BrandingProvider>
  );
}
