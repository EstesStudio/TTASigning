import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatLegalDate,
  PRIVACY_EFFECTIVE_DATE,
  TERMS_EFFECTIVE_DATE,
} from "./legal-date.ts";

test("the terms effective date is formatted in the active language", () => {
  assert.equal(formatLegalDate(TERMS_EFFECTIVE_DATE, "en"), "March 21, 2026");
  assert.equal(formatLegalDate(TERMS_EFFECTIVE_DATE, "id"), "21 Maret 2026");
});

test("the privacy effective date is formatted in the active language", () => {
  assert.equal(formatLegalDate(PRIVACY_EFFECTIVE_DATE, "en"), "March 25, 2026");
  assert.equal(formatLegalDate(PRIVACY_EFFECTIVE_DATE, "id"), "25 Maret 2026");
});
