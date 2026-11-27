import assert from "node:assert/strict";
import { test } from "node:test";

import { describeCopyRecipientDelivery } from "./envelope-detail-copy.ts";

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
