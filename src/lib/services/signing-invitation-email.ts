import { type Branding } from "../branding.ts";
import { formatDeadline } from "../envelope-deadline.ts";
import { emailMessages } from "../i18n/email-messages.ts";
import { DEFAULT_LOCALE, type Locale } from "../i18n/locales.ts";
import { escapeHtml } from "../utils/html.ts";
import { withUserEmailLegalFooter } from "./email-legal-footer.ts";
import { type TransactionalEmailMessage } from "./email.ts";

type SigningInvitationEmailInput = {
  branding: Branding;
  envelopeTitle: string;
  /** The envelope's deadline, when it has one. */
  expiresAt?: number | null;
  senderName: string;
  signerEmail: string;
  signerName: string;
  signingUrl: string;
};

/** "This request expires on …", or nothing for an envelope with no deadline. */
export function buildDeadlineLine(
  expiresAt: number | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string | null {
  return typeof expiresAt === "number"
    ? emailMessages(locale).signing.deadline(formatDeadline(expiresAt, locale))
    : null;
}

export function buildSigningInvitationEmail(
  input: SigningInvitationEmailInput,
): TransactionalEmailMessage {
  const { locale, productName } = input.branding;
  const m = emailMessages(locale);
  const subject = m.signing.invitationSubject({
    sender: input.senderName,
    title: m.quote(input.envelopeTitle),
  });
  const deadlineLine = buildDeadlineLine(input.expiresAt, locale);
  const textBody = [
    m.hi(input.signerName),
    "",
    m.signing.invitationIntro({
      product: productName,
      sender: input.senderName,
      title: m.quote(input.envelopeTitle),
    }),
    "",
    m.signing.reviewAndSignHere,
    input.signingUrl,
    ...(deadlineLine ? ["", deadlineLine] : []),
    "",
    m.signing.noAccountNeeded(productName),
    m.signing.useNewestLink,
  ].join("\n");
  const htmlBody = [
    `<p>${m.hi(escapeHtml(input.signerName))}</p>`,
    `<p>${m.signing.invitationIntro({
      product: escapeHtml(productName),
      sender: escapeHtml(input.senderName),
      title: m.quoteHtml(escapeHtml(input.envelopeTitle)),
    })}</p>`,
    `<p><a href="${escapeHtml(input.signingUrl)}">${m.signing.reviewAndSignLink}</a></p>`,
    deadlineLine ? `<p>${escapeHtml(deadlineLine)}</p>` : "",
    `<p>${m.signing.noAccountNeeded(escapeHtml(productName))}</p>`,
    `<p>${m.signing.useNewestLink}</p>`,
  ].join("");
  const legalFooter = withUserEmailLegalFooter(
    {
      htmlBody,
      textBody,
    },
    input.branding,
  );

  return {
    htmlBody: legalFooter.htmlBody,
    subject,
    template: "signing_invitation",
    textBody: legalFooter.textBody,
    to: input.signerEmail,
  };
}
