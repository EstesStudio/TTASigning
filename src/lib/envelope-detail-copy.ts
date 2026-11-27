import type { EnvelopeDelivery } from "./schemas/envelope.ts";
import { formatReminderInterval } from "./services/reminders.ts";
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

/**
 * Automatic reminder status line on the sender's envelope detail page.
 * Embedded envelopes never receive reminders from SignuDoc.
 */
export function describeAutomaticReminders(input: {
  delivery?: EnvelopeDelivery;
  reminderIntervalDays: number | null;
}): string {
  if (input.delivery === "embedded") {
    return "SignuDoc does not send automatic reminders for embedded envelopes.";
  }

  return input.reminderIntervalDays === null
    ? "Automatic reminders are off."
    : `Automatic reminders: ${formatReminderInterval(input.reminderIntervalDays).toLowerCase()}.`;
}

/** Whether the sender can open and save an automatic reminder schedule. */
export function canEditAutomaticReminders(input: {
  delivery?: EnvelopeDelivery;
  isOwnEnvelope: boolean;
}): boolean {
  return input.isOwnEnvelope && input.delivery !== "embedded";
}
