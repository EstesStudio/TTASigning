import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canEditAutomaticReminders,
  describeAutomaticReminders,
  describeCopyRecipientDelivery,
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
