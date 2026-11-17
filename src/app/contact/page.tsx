import type { Metadata } from "next";
import { connection } from "next/server";

import { ContactForm } from "@/components/contact/contact-form";
import {
  loadBranding,
  PublicDocumentShell,
} from "@/components/layout/public-document-shell";
import { requireHostedMode } from "@/lib/hosted-pages";
import { appMessages } from "@/lib/i18n/app-messages";

export async function generateMetadata(): Promise<Metadata> {
  await connection();

  const m = appMessages((await loadBranding()).locale);

  return {
    description: m.contact.metaDescription,
    title: m.contact.metaTitle,
  };
}

export default async function ContactPage() {
  await requireHostedMode();

  const m = appMessages((await loadBranding()).locale);

  return (
    <PublicDocumentShell
      description={m.contact.description}
      lastUpdated={m.contact.lastUpdated}
      title={m.contact.title}
    >
      <div className="mx-auto w-full max-w-[52rem]">
        <ContactForm />
      </div>
    </PublicDocumentShell>
  );
}
