import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import {
  loadBranding,
  PublicDocumentShell,
} from "@/components/layout/public-document-shell";
import { appMessages } from "@/lib/i18n/app-messages";
import { getSettings } from "@/lib/settings";
import { STALE_DRAFT_RETENTION_DAYS } from "@/lib/retention";

export async function generateMetadata(): Promise<Metadata> {
  await connection();

  const m = appMessages((await loadBranding()).locale);

  return {
    description: m.signerPrivacy.metaDescription,
    title: m.signerPrivacy.title,
  };
}

// A GDPR Article 13 notice for signers, built from the install's settings.
// Shown in the footer when the organization has not linked its own privacy
// policy. The organization remains the controller and should check it.
export default async function SignerPrivacyPage() {
  await connection();

  const settings = await getSettings();

  if (settings.hosted) {
    redirect("/privacy");
  }

  if (settings.privacyUrl) {
    redirect(settings.privacyUrl);
  }

  const m = appMessages(settings.locale).signerPrivacy;
  const organization =
    settings.organizationName?.trim() || m.organizationFallback;
  const contact = settings.supportAddress;
  const retention = settings.retentionDays
    ? m.retentionDays(String(settings.retentionDays))
    : m.retentionKept;

  return (
    <PublicDocumentShell
      description={m.description(organization)}
      lastUpdated={m.lastUpdated}
      title={m.title}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.responsibleHeading}
        </h2>
        <p>
          {m.responsible(organization)}{" "}
          {contact ? (
            <>
              {m.contactAt}{" "}
              <a className="underline" href={`mailto:${contact}`}>
                {contact}
              </a>
              .
            </>
          ) : (
            m.contactThroughSender
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.collectedHeading}
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{m.collectedIdentity}</li>
          <li>{m.collectedInput}</li>
          <li>{m.collectedEvidence}</li>
          <li>{m.collectedEmails}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.basisHeading}
        </h2>
        <p>{m.basis}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.recipientsHeading}
        </h2>
        <p>{m.recipients(organization)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.retentionHeading}
        </h2>
        <p>
          {retention} {m.draftRetention(String(STALE_DRAFT_RETENTION_DAYS))}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          {m.rightsHeading}
        </h2>
        <p>{m.rights(organization)}</p>
      </section>
    </PublicDocumentShell>
  );
}
