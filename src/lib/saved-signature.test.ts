import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SavedSignatureError,
  isSignerAccount,
  parseSignatureDataUrl,
} from "./saved-signature.ts";
import { clearPaper } from "./signature-image.ts";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test("a whole PNG data URL is accepted", () => {
  const bytes = parseSignatureDataUrl(`data:image/png;base64,${ONE_PIXEL_PNG}`);

  assert.equal(bytes[1], 0x50);
});

test("anything but a whole PNG is refused", () => {
  for (const value of [
    null,
    "",
    `data:image/jpeg;base64,${ONE_PIXEL_PNG}`,
    `data:image/png;base64,${ONE_PIXEL_PNG.slice(0, 40)}`,
    "data:image/png;base64,PHN2Zz48L3N2Zz4=",
  ]) {
    assert.throws(() => parseSignatureDataUrl(value), SavedSignatureError);
  }
});

test("a PNG over the drawn-signature limit is refused", () => {
  const big = Buffer.alloc(300 * 1024).toString("base64");

  assert.throws(
    () => parseSignatureDataUrl(`data:image/png;base64,${big}`),
    (error) => error instanceof SavedSignatureError && error.statusCode === 413,
  );
});

test("the signer's account is the one with their confirmed address", () => {
  const user = { email: "Ana@Example.com", emailVerified: true, id: "u1" };

  assert.equal(isSignerAccount(user, "ana@example.com "), true);
  assert.equal(isSignerAccount(user, "bob@example.com"), false);
  assert.equal(
    isSignerAccount({ ...user, emailVerified: false }, "ana@example.com"),
    false,
  );
  assert.equal(isSignerAccount(null, "ana@example.com"), false);
});

test("paper turns transparent and the ink's bounds are found", () => {
  // 3x1: white paper, black ink, grey between.
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255, 0, 0, 0, 255, 160, 160, 160, 255,
  ]);

  assert.deepEqual(clearPaper(pixels, 3, 1), {
    bottom: 0,
    left: 1,
    right: 2,
    top: 0,
  });
  assert.equal(pixels[3], 0);
  assert.equal(pixels[7], 255);
  assert.equal(pixels[11], 128);
});

test("an image without ink has no bounds", () => {
  assert.equal(
    clearPaper(new Uint8ClampedArray([250, 250, 250, 255]), 1, 1),
    null,
  );
});
