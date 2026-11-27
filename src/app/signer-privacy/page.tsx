import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicDocumentShell } from "@/components/layout/public-document-shell";
import { STALE_DRAFT_RETENTION_DAYS } from "@/lib/retention";
import { ServiceConfigurationError } from "@/lib/services/service-config";
import {
  getSettings,
  resolveSettings,
  type ResolvedSettings,
} from "@/lib/settings";
import { resolveSignerPrivacyPage } from "@/lib/signer-privacy";
import { isHostedMode } from "@/lib/utils/env";

export const metadata: Metadata = {
  description: "How your information is used when you sign a document here.",
  title: "Privacy notice for signers",
};

async function loadSignerPrivacySettings(): Promise<ResolvedSettings> {
  try {
    return await getSettings();
  } catch (error) {
    if (error instanceof ServiceConfigurationError) {
      return resolveSettings(null);
    }

    throw error;
  }
}

// A GDPR Article 13 notice for signers, built from the install's settings.
// Shown in the footer when the organization has not linked its own privacy
// policy. The organization remains the controller and should check it.
export default async function SignerPrivacyPage() {
  await connection();

  if (isHostedMode()) {
    redirect("/privacy");
  }

  const settings = await loadSignerPrivacySettings();
  const resolved = resolveSignerPrivacyPage(settings);

  if (resolved.kind === "redirect") {
    redirect(resolved.destination);
  }

  const { notice } = resolved;

  return (
    <PublicDocumentShell
      description={notice.description}
      lastUpdated="2026-11-13"
      title="Privacy notice for signers"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          Who is responsible
        </h2>
        <p>
          {notice.organizationSubject} is responsible for your information (the
          &ldquo;controller&rdquo;).{" "}
          {notice.contact ? (
            <>
              Contact them at{" "}
              <a className="underline" href={notice.contact.href}>
                {notice.contact.address}
              </a>
              .
            </>
          ) : (
            "Contact them through the person who sent you the document."
          )}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          What is collected
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Your name and email address, given by the sender.</li>
          <li>
            What you enter: your signature or initials (typed or drawn), dates,
            text and checkboxes, or your reason for declining.
          </li>
          <li>
            Evidence of signing: when you opened, agreed and signed, your IP
            address, your browser&apos;s description of itself, and the checks
            you passed (such as an emailed code).
          </li>
          <li>Records of the emails sent to you about the document.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          Why, and on what basis
        </h2>
        <p>
          To let you review and sign the document, to deliver copies, and to
          keep evidence of who signed what and when. The basis is taking steps
          for or performing a contract you are part of (GDPR Article 6(1)(b)),
          the organization&apos;s legitimate interest in being able to prove the
          agreement (Article 6(1)(f)), and any legal duty to keep records
          (Article 6(1)(c)).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          Who else handles it
        </h2>
        <p>{notice.processors}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          How long it is kept
        </h2>
        <p>
          {notice.retention} Unsent drafts are deleted after{" "}
          {String(STALE_DRAFT_RETENTION_DAYS)} days without changes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
          Your rights
        </h2>
        <p>{notice.rights}</p>
      </section>
    </PublicDocumentShell>
  );
}
