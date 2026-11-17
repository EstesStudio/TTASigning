import type { Metadata } from "next";
import { connection } from "next/server";

import { PublicDocumentShell } from "@/components/layout/public-document-shell";
import { VerifyForm } from "@/components/verify/verify-form";
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
  const messages = envelopeMessages(await loadLocale()).verify;

  return {
    description: messages.metaDescription,
    title: messages.title,
  };
}

export default async function VerifyPage() {
  // Read when the page is requested, so one build serves any install.
  await connection();

  const messages = envelopeMessages(await loadLocale()).verify;

  return (
    <PublicDocumentShell
      description={messages.description}
      title={messages.title}
    >
      <div className="mx-auto w-full max-w-[52rem] space-y-8">
        <VerifyForm />
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
            {messages.sealHeading}
          </h2>
          <p>{messages.sealBody}</p>
        </section>
      </div>
    </PublicDocumentShell>
  );
}
