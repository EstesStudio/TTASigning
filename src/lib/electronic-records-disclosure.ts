import { DEFAULT_LOCALE, type Locale } from "./i18n/locales.ts";

// What a signer is told, and agrees to, before signing: the disclosure the
// US laws on electronic signatures expect (ESIGN 101(c), UETA 5) and that
// works as a plain statement of terms elsewhere. Its version is stored with
// each signer's agreement, so the record shows which words they saw. Change
// the version whenever the words change.
//
// Each language has its own words and so its own version: the record then
// says which language the signer read, as well as which revision. Change a
// translation's version whenever its words change, and whenever the English
// words it translates change.

const DISCLOSURE_VERSIONS: Record<Locale, string> = {
  en: "2026-11-13",
  fr: "2026-11-18-fr",
};

/** The English disclosure's version. */
export const ELECTRONIC_RECORDS_DISCLOSURE_VERSION = DISCLOSURE_VERSIONS.en;

/** The version of the disclosure in this language. */
export function disclosureVersion(locale: Locale = DEFAULT_LOCALE): string {
  return DISCLOSURE_VERSIONS[locale];
}

export type DisclosureParty = {
  /** Who to ask for a paper copy or to withdraw: the organization or sender. */
  contactAddress: string | null;
  senderName: string;
};

export type DisclosureSection = { heading: string; text: string };

function englishDisclosure(party: DisclosureParty): DisclosureSection[] {
  const contact = party.contactAddress
    ? `${party.senderName} at ${party.contactAddress}`
    : party.senderName;

  return [
    {
      heading: "Using electronic records and signatures",
      text: `${party.senderName} asks you to receive this document and sign it electronically instead of on paper. If you agree, your electronic signature has the same effect as a handwritten one, and the documents you receive this way count as delivered to you in writing.`,
    },
    {
      heading: "You can choose paper instead",
      text: `You do not have to agree. To sign on paper instead, or to ask for a paper copy of any document after signing, contact ${contact}. A paper copy is free unless ${party.senderName} tells you otherwise before you ask.`,
    },
    {
      heading: "Withdrawing your agreement",
      text: `You can withdraw this agreement at any time before you sign by declining or by telling ${contact}. Withdrawing does not undo a signature you already gave.`,
    },
    {
      heading: "What you need",
      text: "A current web browser and a device that can open and save PDF files. You will receive the signed document by email, so keep your email address up to date with the sender. Download and keep the signed copy: it is your record.",
    },
    {
      heading: "This agreement covers",
      text: "This document and the notices about it that are sent to you through this site.",
    },
  ];
}

function frenchDisclosure(party: DisclosureParty): DisclosureSection[] {
  const contact = party.contactAddress
    ? `${party.senderName} à l’adresse ${party.contactAddress}`
    : party.senderName;

  return [
    {
      heading: "Utilisation de documents et de signatures électroniques",
      text: `${party.senderName} vous propose de recevoir ce document et de le signer par voie électronique plutôt que sur papier. Si vous acceptez, votre signature électronique a la même valeur qu’une signature manuscrite, et les documents que vous recevez de cette manière vous sont considérés comme remis par écrit.`,
    },
    {
      heading: "Vous pouvez choisir le papier",
      text: `Vous n’êtes pas obligé d’accepter. Pour signer sur papier, ou pour demander une copie papier d’un document après l’avoir signé, contactez ${contact}. La copie papier est gratuite, sauf si ${party.senderName} vous indique le contraire avant votre demande.`,
    },
    {
      heading: "Retirer votre accord",
      text: `Vous pouvez retirer cet accord à tout moment avant de signer, en refusant de signer ou en prévenant ${contact}. Le retrait n’annule pas une signature déjà donnée.`,
    },
    {
      heading: "Ce dont vous avez besoin",
      text: "Un navigateur web à jour et un appareil capable d’ouvrir et d’enregistrer des fichiers PDF. Vous recevrez le document signé par e-mail : veillez à ce que l’expéditeur dispose de votre adresse e-mail à jour. Téléchargez et conservez la copie signée : elle constitue votre preuve.",
    },
    {
      heading: "Portée de cet accord",
      text: "Ce document et les notifications le concernant qui vous sont envoyées par ce site.",
    },
  ];
}

export function buildElectronicRecordsDisclosure(
  party: DisclosureParty,
  locale: Locale = DEFAULT_LOCALE,
): DisclosureSection[] {
  return locale === "fr" ? frenchDisclosure(party) : englishDisclosure(party);
}

const CONSENT_STATEMENTS: Record<Locale, string> = {
  en: "I have read the disclosure above, I can open and save PDF files on this device, and I agree to use electronic records and signatures for this document.",
  fr: "J’ai lu les informations ci-dessus, je peux ouvrir et enregistrer des fichiers PDF sur cet appareil, et j’accepte l’utilisation de documents et de signatures électroniques pour ce document.",
};

/** The English statement a signer agrees to. */
export const CONSENT_STATEMENT = CONSENT_STATEMENTS.en;

/** The statement a signer agrees to, in this language. */
export function consentStatement(locale: Locale = DEFAULT_LOCALE): string {
  return CONSENT_STATEMENTS[locale];
}
