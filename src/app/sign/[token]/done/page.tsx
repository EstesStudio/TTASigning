import { SigningDoneShell } from "@/components/signing/signing-done-shell";
import { getBranding } from "@/lib/settings";

type SignDonePageProps = {
  searchParams?: Promise<{
    title?: string | string[];
  }>;
};

export default async function SignDonePage({
  searchParams,
}: SignDonePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const envelopeTitle = Array.isArray(resolvedSearchParams?.title)
    ? resolvedSearchParams.title[0]
    : resolvedSearchParams?.title;

  const { locale } = await getBranding();

  return <SigningDoneShell envelopeTitle={envelopeTitle} locale={locale} />;
}
