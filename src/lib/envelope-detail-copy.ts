import type { EnvelopeStatus } from "./types/domain.ts";

/**
 * Explains what happened (or will happen) to copy recipients on the sender's
 * envelope detail page. Copies are only sent once every signer completes the
 * envelope.
 */
export function describeCopyRecipientDelivery(status: EnvelopeStatus): string {
  switch (status) {
    case "completed":
      return "Sent the finished document and its certificate.";
    case "voided":
      return "No copy was sent because this envelope was voided.";
    case "declined":
      return "No copy was sent because this envelope was declined.";
    case "draft":
    case "sent":
      return "Gets the finished document once everyone has signed.";
  }
}
