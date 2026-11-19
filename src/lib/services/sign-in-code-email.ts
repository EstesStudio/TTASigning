import type { Branding } from "../branding.ts";
import { escapeHtml } from "../utils/html.ts";
import { withUserEmailLegalFooter } from "./email-legal-footer.ts";

// The emailed second step of a sign-in: a 6-digit code from Better Auth's
// two-factor OTP. It goes to the person with the account, not to a signer,
// so it is English like the other auth emails (server.ts); signer mail is
// the only kind the install translates.

/** How long an emailed code works, in minutes. server.ts sets the same on the plugin. */
export const SIGN_IN_CODE_MINUTES = 10;

export function buildSignInCodeMessage(input: {
  branding: Branding;
  code: string;
  name: string;
}): {
  htmlBody: string;
  subject: string;
  template: "sign_in_code";
  textBody: string;
} {
  const { productName } = input.branding;
  const minutes = String(SIGN_IN_CODE_MINUTES);
  const textBody = [
    `Hi ${input.name},`,
    "",
    `Your code to sign in to ${productName} is:`,
    "",
    input.code,
    "",
    `It works for ${minutes} minutes. If you did not just try to sign in, ignore this email.`,
  ].join("\n");
  const htmlBody = [
    `<p>Hi ${escapeHtml(input.name)},</p>`,
    `<p>Your code to sign in to ${escapeHtml(productName)} is:</p>`,
    `<p style="font-size:24px;font-weight:700;letter-spacing:4px">${escapeHtml(input.code)}</p>`,
    `<p>It works for ${minutes} minutes. If you did not just try to sign in, ignore this email.</p>`,
  ].join("");
  const legalFooter = withUserEmailLegalFooter(
    { htmlBody, textBody },
    input.branding,
  );

  return {
    htmlBody: legalFooter.htmlBody,
    subject: `Your ${productName} sign-in code`,
    template: "sign_in_code",
    textBody: legalFooter.textBody,
  };
}
