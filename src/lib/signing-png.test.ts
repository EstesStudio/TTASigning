import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePngDataUrl } from "./signing.ts";

function pngDataUrl(width: number, height: number, signature = true): string {
  const bytes = Buffer.alloc(33);

  if (signature) {
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  }

  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);

  return `data:image/png;base64,${bytes.toString("base64")}`;
}

test("a drawn signature of ordinary size is accepted", () => {
  assert.equal(parsePngDataUrl(pngDataUrl(600, 200)).byteLength, 33);
});

test("a drawn signature that declares a huge canvas is refused", () => {
  assert.throws(() => parsePngDataUrl(pngDataUrl(60000, 60000)), /too large/);
  assert.throws(() => parsePngDataUrl(pngDataUrl(4000, 4000)), /too large/);
  assert.throws(() => parsePngDataUrl(pngDataUrl(0, 10)), /too large/);
});

test("a drawn signature that is not a real PNG is refused", () => {
  assert.throws(
    () => parsePngDataUrl(pngDataUrl(100, 100, false)),
    /PNG images/,
  );
});
