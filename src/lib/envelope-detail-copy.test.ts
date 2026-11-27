import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canEditAutomaticReminders,
  describeAutomaticReminders,
  describeCopyRecipientDelivery,
  describeDeadlineDialogNote,
  describeEnvelopeDeadline,
} from "./envelope-detail-copy.ts";

test("copy recipient status copy distinguishes terminal outcomes from pending delivery (issue #238)", () => {
  assert.equal(
    describeCopyRecipientDelivery("draft"),
    "Gets the finished document once everyone has signed.",
  );
  assert.equal(
    describeCopyRecipientDelivery("sent"),
    "Gets the finished document once everyone has signed.",
  );
  assert.equal(
    describeCopyRecipientDelivery("completed"),
    "Sent the finished document and its certificate.",
  );
  assert.equal(
    describeCopyRecipientDelivery("voided"),
    "No copy was sent because this envelope was voided.",
  );
  assert.equal(
    describeCopyRecipientDelivery("declined"),
    "No copy was sent because this envelope was declined.",
  );
});

test("automatic reminder copy and editability reflect embedded vs email delivery (issue #246)", () => {
  assert.equal(
    describeAutomaticReminders({
      delivery: "embedded",
      reminderIntervalDays: null,
    }),
    "SignuDoc does not send automatic reminders for embedded envelopes.",
  );
  // Even if a pre-existing DB row had a saved interval, embedded delivery
  // never shows an active schedule.
  assert.equal(
    describeAutomaticReminders({
      delivery: "embedded",
      reminderIntervalDays: 5,
    }),
    "SignuDoc does not send automatic reminders for embedded envelopes.",
  );
  assert.equal(
    describeAutomaticReminders({
      delivery: "email",
      reminderIntervalDays: null,
    }),
    "Automatic reminders are off.",
  );
  assert.equal(
    describeAutomaticReminders({
      delivery: "email",
      reminderIntervalDays: 1,
    }),
    "Automatic reminders: every day.",
  );
  assert.equal(
    describeAutomaticReminders({
      delivery: "email",
      reminderIntervalDays: 5,
    }),
    "Automatic reminders: every 5 days.",
  );
  assert.equal(
    describeAutomaticReminders({
      reminderIntervalDays: 7,
    }),
    "Automatic reminders: every week.",
  );

  assert.equal(
    canEditAutomaticReminders({ delivery: "embedded", isOwnEnvelope: true }),
    false,
  );
  assert.equal(
    canEditAutomaticReminders({ delivery: "email", isOwnEnvelope: true }),
    true,
  );
  assert.equal(
    canEditAutomaticReminders({ delivery: "email", isOwnEnvelope: false }),
    false,
  );
  assert.equal(canEditAutomaticReminders({ isOwnEnvelope: true }), true);
});

test("deadline banner and dialog copy match embedded vs email link recovery (issue #247)", () => {
  const label = "November 24, 2026 at 6:34 AM UTC";

  const embeddedExpiredBanner = describeEnvelopeDeadline({
    delivery: "embedded",
    expired: true,
    expiresAtLabel: label,
  });

  assert.equal(
    embeddedExpiredBanner,
    `Expired ${label}. Nobody can sign until you set a new deadline and your app requests a fresh signing link.`,
  );
  assert.equal(
    describeEnvelopeDeadline({
      delivery: "email",
      expired: true,
      expiresAtLabel: label,
    }),
    `Expired ${label}. Nobody can sign until you set a new deadline.`,
  );
  assert.equal(
    describeEnvelopeDeadline({
      delivery: "embedded",
      expired: false,
      expiresAtLabel: label,
    }),
    `Expires ${label}.`,
  );
  assert.equal(
    describeEnvelopeDeadline({
      delivery: "email",
      expired: false,
      expiresAtLabel: null,
    }),
    "No deadline. Each signing link lasts seven days.",
  );

  const embeddedExpiredNote = describeDeadlineDialogNote({
    delivery: "embedded",
    expired: true,
  });

  assert.doesNotMatch(embeddedExpiredNote, /will work again/i);
  assert.match(embeddedExpiredNote, /stay expired/i);
  assert.match(embeddedExpiredNote, /request a fresh signing link/i);

  const embeddedActiveNote = describeDeadlineDialogNote({
    delivery: "embedded",
    expired: false,
  });

  assert.doesNotMatch(embeddedActiveNote, /already sent keeps working/i);
  assert.match(embeddedActiveNote, /keep their own expiry/i);
  assert.match(embeddedActiveNote, /request a fresh signing link/i);

  assert.equal(
    describeDeadlineDialogNote({ delivery: "email", expired: true }),
    "The new deadline counts from now. The signing link that was already sent will work again.",
  );
  assert.equal(
    describeDeadlineDialogNote({ delivery: "email", expired: false }),
    "The new deadline counts from now. The signing link that was already sent keeps working until then.",
  );
  assert.equal(
    describeDeadlineDialogNote({ expired: true }),
    "The new deadline counts from now. The signing link that was already sent will work again.",
  );
});
