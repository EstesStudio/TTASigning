import assert from "node:assert/strict";
import { test } from "node:test";

import { type Branding } from "../branding.ts";
import {
  buildSignInCodeMessage,
  SIGN_IN_CODE_MINUTES,
} from "./sign-in-code-email.ts";

const branding: Branding = {
  brandColor: null,
  contactUrl: null,
  hosted: false,
  logoUrl: null,
  organizationName: "Acme Corp",
  privacyUrl: null,
  productName: "Acme Corp",
  signupAvailable: true,
  supportAddress: null,
  termsUrl: null,
};

test("the emailed sign-in code carries the code, in English, for ten minutes", () => {
  const message = buildSignInCodeMessage({
    branding,
    code: "123456",
    name: "Jane Smith",
  });

  assert.equal(message.subject, "Your Acme Corp sign-in code");
  assert.equal(message.template, "sign_in_code");
  assert.equal(SIGN_IN_CODE_MINUTES, 10);
  assert.match(message.textBody, /Hi Jane Smith,/);
  assert.match(message.textBody, /\b123456\b/);
  assert.match(message.textBody, /It works for 10 minutes\./);
  assert.match(message.htmlBody, /<p[^>]*>123456<\/p>/);
});
