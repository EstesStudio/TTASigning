// What a signer is told, and agrees to, before signing: the disclosure the
// US laws on electronic signatures expect (ESIGN 101(c), UETA 5) and that
// works as a plain statement of terms elsewhere. Its version is stored with
// each signer's agreement, so the record shows which words they saw. Change
// the version whenever the words change.
//
// The words come in two languages (i18n.ts) and the version is the same in
// both: it names the wording, not the language. Which language a signer saw
// is the record itself — the statement stored with their agreement is the
// sentence they agreed to, in the language they read it in.

import { type SignerLocale, t } from "./i18n.ts";

export const ELECTRONIC_RECORDS_DISCLOSURE_VERSION = "2026-11-13";

export type DisclosureParty = {
  /** Who to ask for a paper copy or to withdraw: the organization or sender. */
  contactAddress: string | null;
  senderName: string;
};

export type DisclosureSection = { heading: string; text: string };

export function buildElectronicRecordsDisclosure(
  party: DisclosureParty,
  locale: SignerLocale = "en",
): DisclosureSection[] {
  const contact = party.contactAddress
    ? t(locale, "disclosure.contactAt", {
        sender: party.senderName,
        contact: party.contactAddress,
      })
    : party.senderName;

  return [
    {
      heading: t(locale, "disclosure.using.heading"),
      text: t(locale, "disclosure.using.text", { sender: party.senderName }),
    },
    {
      heading: t(locale, "disclosure.paper.heading"),
      text: t(locale, "disclosure.paper.text", {
        contact,
        sender: party.senderName,
      }),
    },
    {
      heading: t(locale, "disclosure.withdraw.heading"),
      text: t(locale, "disclosure.withdraw.text", { contact }),
    },
    {
      heading: t(locale, "disclosure.needs.heading"),
      text: t(locale, "disclosure.needs.text"),
    },
    {
      heading: t(locale, "disclosure.covers.heading"),
      text: t(locale, "disclosure.covers.text"),
    },
  ];
}

/**
 * The sentence the signer checks off, in the language they read the
 * disclosure in. Stored with the agreement, so the record says which words
 * they agreed to.
 */
export function buildConsentStatement(locale: SignerLocale = "en"): string {
  return t(locale, "disclosure.consent");
}

/** The consent statement as the English words say it. */
export const CONSENT_STATEMENT = buildConsentStatement("en");
