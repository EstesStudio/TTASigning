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

/**
 * Deadline banner text on the sender's envelope detail page while the
 * envelope is out for signature.
 */
export function describeEnvelopeDeadline(input: {
  delivery?: EnvelopeDelivery;
  expired: boolean;
  expiresAtLabel: string | null;
}): string {
  if (input.expired) {
    return input.delivery === "embedded"
      ? `Expired ${input.expiresAtLabel}. Nobody can sign until you set a new deadline and your app requests a fresh signing link.`
      : `Expired ${input.expiresAtLabel}. Nobody can sign until you set a new deadline.`;
  }

  return input.expiresAtLabel
    ? `Expires ${input.expiresAtLabel}.`
    : "No deadline. Each signing link lasts seven days.";
}

/**
 * Recovery explanation inside the Set/Change deadline dialog. Embedded links
 * keep their own short lifetime and never revive after expiry.
 */
export function describeDeadlineDialogNote(input: {
  delivery?: EnvelopeDelivery;
  expired: boolean;
}): string {
  if (input.delivery === "embedded") {
    return input.expired
      ? "The new deadline counts from now. Previous embedded signing links stay expired, so your app will need to request a fresh signing link."
      : "The new deadline counts from now. Existing embedded signing links keep their own expiry; your app can request a fresh signing link until the new deadline.";
  }

  return input.expired
    ? "The new deadline counts from now. The signing link that was already sent will work again."
    : "The new deadline counts from now. The signing link that was already sent keeps working until then.";
}
