import { type DbExecutor, getDb } from "./db/connection.ts";
import {
  renewRecipientDownloadLinks,
  type RenewedDownloadLinks,
} from "./downloads.ts";
import { getBranding } from "./settings.ts";
import { emailMessages } from "./i18n/email-messages.ts";
import { recordEmailSent } from "./services/audit.ts";
import { createEmailService, type EmailService } from "./services/email.ts";
import { withUserEmailLegalFooter } from "./services/email-legal-footer.ts";
import { RECIPIENT_DOWNLOAD_LINK_TTL_SECONDS } from "./types/domain.ts";
import { escapeHtml } from "./utils/html.ts";

const TTL_DAYS = RECIPIENT_DOWNLOAD_LINK_TTL_SECONDS / (24 * 60 * 60);

/** Sends fresh download links to the signer an expired link belonged to. */
export async function sendFreshDownloadLinks(
  token: string,
  {
    database = getDb(),
    emailService = createEmailService(),
  }: { database?: DbExecutor; emailService?: EmailService } = {},
): Promise<RenewedDownloadLinks> {
  const branding = await getBranding();

  return renewRecipientDownloadLinks(token, {
    database,
    async sendLinks({ envelope, evidenceUrl, signedUrl, signer }) {
      const m = emailMessages(branding.locale);
      const subject = m.downloads.renewedSubject(m.quote(envelope.title));
      const textBody = [
        m.hi(signer.name),
        "",
        m.downloads.renewedIntro({
          days: TTL_DAYS,
          product: branding.productName,
          title: m.quote(envelope.title),
        }),
        "",
        ...(signedUrl ? [m.downloads.signedPdf(signedUrl)] : []),
        m.downloads.certificate(evidenceUrl),
        "",
        m.downloads.keepFiles,
      ].join("\n");
      const htmlBody = [
        `<p>${m.hi(escapeHtml(signer.name))}</p>`,
        `<p>${m.downloads.renewedIntro({
          days: TTL_DAYS,
          product: escapeHtml(branding.productName),
          title: m.quoteHtml(escapeHtml(envelope.title)),
        })}</p>`,
        "<p>",
        signedUrl
          ? `<a href="${escapeHtml(signedUrl)}">${m.downloads.downloadSignedPdf}</a><br />`
          : "",
        `<a href="${escapeHtml(evidenceUrl)}">${m.downloads.downloadCertificate}</a></p>`,
        `<p>${m.downloads.keepFiles}</p>`,
      ].join("");
      const body = withUserEmailLegalFooter({ htmlBody, textBody }, branding);
      const delivery = await emailService.send({
        htmlBody: body.htmlBody,
        subject,
        template: "download_links",
        textBody: body.textBody,
        to: signer.email,
      });

      await recordEmailSent(
        {
          envelopeId: envelope.id,
          messageId: delivery.messageId,
          recipient: signer.email,
          signerId: signer.id,
          template: "download_links",
        },
        database,
      );
    },
  });
}
