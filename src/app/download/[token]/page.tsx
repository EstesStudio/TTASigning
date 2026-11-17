import type { Metadata } from "next";
import { connection } from "next/server";

import { PublicDocumentShell } from "@/components/layout/public-document-shell";
import { RenewDownloadButton } from "@/components/downloads/renew-download-button";
import { envelopeMessages } from "@/lib/i18n/envelope-messages";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { getBranding } from "@/lib/settings";

// The page is public and on every install, so a database that cannot be
// reached leaves it in English rather than failing it.
async function loadLocale(): Promise<Locale> {
  try {
    return (await getBranding()).locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: { follow: false, index: false },
    title: envelopeMessages(await loadLocale()).download.metaTitle,
  };
}

type ExpiredDownloadPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ExpiredDownloadPage({
  params,
}: ExpiredDownloadPageProps) {
  const { token } = await params;

  await connection();

  const messages = envelopeMessages(await loadLocale()).download;

  return (
    <PublicDocumentShell
      description={messages.description}
      title={messages.title}
    >
      <div className="mx-auto w-full max-w-[52rem]">
        <RenewDownloadButton token={token} />
      </div>
    </PublicDocumentShell>
  );
}
