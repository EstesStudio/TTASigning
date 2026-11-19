import { BrandingProvider } from "@/components/layout/branding-provider";
import { SigningDoneShell } from "@/components/signing/signing-done-shell";
import { getDb } from "@/lib/db/connection";
import {
  applyDocumentBranding,
  getDocumentBranding,
} from "@/lib/petsky/document-branding";
import { getBranding } from "@/lib/settings";

type SignDonePageProps = {
  searchParams?: Promise<{
    d?: string | string[];
    title?: string | string[];
  }>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignDonePage({
  searchParams,
}: SignDonePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const envelopeTitle = first(resolvedSearchParams?.title);
  // PetskySign: the business that sent the document, and whether its
  // signer is reached by email (see document-branding.ts).
  const envelopeId = first(resolvedSearchParams?.d);
  const documentBranding = envelopeId
    ? await getDocumentBranding(envelopeId, getDb()).catch(() => null)
    : null;

  return (
    <BrandingProvider
      branding={applyDocumentBranding(await getBranding(), documentBranding)}
    >
      <SigningDoneShell
        deliveryChannel={documentBranding?.deliveryChannel ?? "email"}
        envelopeTitle={envelopeTitle}
      />
    </BrandingProvider>
  );
}
