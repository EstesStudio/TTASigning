import { buildPublicSupportLink, type PublicSupportLink } from "./legal.ts";
import {
  hasBlobCredentials,
  resolveStorageDriver,
  type StorageDriver,
} from "./services/storage/driver.ts";
import type { ResolvedSettings } from "./settings.ts";
import { isHostedMode, readEnv, type EnvSource } from "./utils/env.ts";

// Built-in GDPR Article 13 notice for signers on a non-hosted install when
// the organization has not linked its own privacy policy. The processor copy
// follows the instance's actual hosting and file storage instead of assuming
// every install runs on Vercel and Vercel Blob.

const DEFAULT_ORGANIZATION_SUBJECT = "The organization that runs this site";
const DEFAULT_ORGANIZATION_OBJECT = "the organization that runs this site";

const EEA_TRANSFER_CLAUSE =
  "where information leaves the European Economic Area, it is protected by the EU-US Data Privacy Framework or by standard contractual clauses.";

export type SignerPrivacyHosting = "self-hosted" | "vercel";

export type SignerPrivacyDeployment = {
  hosting: SignerPrivacyHosting;
  storage: StorageDriver;
};

export type SignerPrivacySettings = Pick<
  ResolvedSettings,
  | "hosted"
  | "organizationName"
  | "privacyUrl"
  | "retentionDays"
  | "supportAddress"
>;

export type SignerPrivacyNotice = {
  contact: PublicSupportLink | null;
  deployment: SignerPrivacyDeployment;
  description: string;
  organizationObject: string;
  organizationSubject: string;
  processors: string;
  retention: string;
  rights: string;
};

export type SignerPrivacyPageResolution =
  | { destination: string; kind: "redirect" }
  | { kind: "notice"; notice: SignerPrivacyNotice };

function resolveStorageForNotice(
  env: EnvSource,
  onVercel: boolean,
): StorageDriver {
  try {
    return resolveStorageDriver(env);
  } catch {
    // An unrecognized STORAGE_DRIVER should not stop the privacy notice from
    // rendering; fall back to the same detection rule as driver.ts.
    return hasBlobCredentials(env) || onVercel ? "blob" : "local";
  }
}

/** How this deployment hosts the app and stores uploaded documents. */
export function resolveSignerPrivacyDeployment(
  env: EnvSource = process.env,
): SignerPrivacyDeployment {
  const onVercel = readEnv(env, "VERCEL") === "1";

  return {
    hosting: onVercel ? "vercel" : "self-hosted",
    storage: resolveStorageForNotice(env, onVercel),
  };
}

/**
 * The "Who else handles it" paragraph for the built-in signer privacy notice,
 * naming Vercel and Vercel Blob only when this deployment actually uses them.
 */
export function buildSignerPrivacyProcessorsText(
  organizationName: string | null | undefined,
  deployment: SignerPrivacyDeployment,
): string {
  const namedOrganization = organizationName?.trim() || null;
  const organizationObject = namedOrganization ?? DEFAULT_ORGANIZATION_OBJECT;
  const intro =
    "The other parties to the document see your name, email and signature.";

  if (deployment.hosting === "vercel") {
    const storagePhrase =
      deployment.storage === "blob"
        ? "file storage (Vercel Blob)"
        : "the site's configured file storage";

    return `${intro} The services that run this site process it for ${organizationObject}: the hosting provider (Vercel), the database provider (such as Neon), ${storagePhrase} and the email provider (Resend). Some are based in the United States; ${EEA_TRANSFER_CLAUSE}`;
  }

  const hostClause = namedOrganization
    ? `${namedOrganization} hosts this site`
    : `${DEFAULT_ORGANIZATION_SUBJECT} hosts it`;
  const processorTarget = namedOrganization ?? "it";

  if (deployment.storage === "blob") {
    return `${intro} ${hostClause} alongside its database. Any hosting or database provider it uses, file storage (Vercel Blob) and the email provider (Resend) process your information for ${processorTarget}. Some are based in the United States; ${EEA_TRANSFER_CLAUSE}`;
  }

  return `${intro} ${hostClause} and stores documents on its own storage alongside its database. Any hosting or database provider it uses, and the email provider (Resend) when emails are sent, process your information for ${processorTarget}. Where any of those services are based in the United States and ${EEA_TRANSFER_CLAUSE.slice("where ".length)}`;
}

/** Builds the text and links for the built-in signer privacy notice. */
export function buildSignerPrivacyNotice(
  settings: Pick<
    SignerPrivacySettings,
    "organizationName" | "retentionDays" | "supportAddress"
  >,
  env: EnvSource = process.env,
): SignerPrivacyNotice {
  const namedOrganization = settings.organizationName?.trim() || null;
  const organizationSubject = namedOrganization ?? DEFAULT_ORGANIZATION_SUBJECT;
  const organizationObject = namedOrganization ?? DEFAULT_ORGANIZATION_OBJECT;
  const deployment = resolveSignerPrivacyDeployment(env);
  const retention = settings.retentionDays
    ? `Finished documents and their audit trails are deleted ${String(settings.retentionDays)} days after they are finished.`
    : "Finished documents and their audit trails are kept until the organization deletes them, because they are evidence of an agreement and many must be kept for years by law.";

  return {
    contact: buildPublicSupportLink(settings.supportAddress),
    deployment,
    description: `${organizationSubject} uses this site to send documents for electronic signature. This notice says what is collected about you when you sign, why, and what you can do about it.`,
    organizationObject,
    organizationSubject,
    processors: buildSignerPrivacyProcessorsText(namedOrganization, deployment),
    retention,
    rights: `You can ask ${organizationObject} for a copy of your information, to correct it, to restrict or object to its use, or to erase it. A signed record may be kept despite a request to erase it while it is needed as evidence or by law (GDPR Article 17(3)). You can also complain to the data protection authority where you live or work.`,
  };
}

/**
 * Resolves `/signer-privacy`: hosted installs use `/privacy`, organizations
 * with a published policy redirect there, and everyone else gets the built-in
 * notice tailored to this deployment.
 */
export function resolveSignerPrivacyPage(
  settings: SignerPrivacySettings,
  env: EnvSource = process.env,
): SignerPrivacyPageResolution {
  if (isHostedMode(env) || settings.hosted) {
    return { destination: "/privacy", kind: "redirect" };
  }

  const customPrivacyUrl = settings.privacyUrl?.trim();

  if (customPrivacyUrl) {
    return { destination: customPrivacyUrl, kind: "redirect" };
  }

  return {
    kind: "notice",
    notice: buildSignerPrivacyNotice(settings, env),
  };
}
