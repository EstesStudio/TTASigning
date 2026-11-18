import assert from "node:assert/strict";
import test from "node:test";

import {
  BrandLogoError,
  MAX_LOGO_BYTES,
  checkLogoUpload,
  sniffLogoContentType,
} from "./brand-logo.ts";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46];
const WEBP = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
];

// Real 1x1 images, checked to render in Chromium.
const WHOLE_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const WHOLE_JPEG = Uint8Array.from(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQAASABIAAD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQ" +
      "EAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEG" +
      "E1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISU" +
      "pTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKz" +
      "tLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAw" +
      "EBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEE" +
      "BSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5Ok" +
      "NERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOk" +
      "paanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9" +
      "sAQwAbGxsbGxsvGxsvQi8vL0JZQkJCQllwWVlZWVlwiHBwcHBwcIiIiIiIiIiIo6Ojo6Oj" +
      "vr6+vr7V1dXV1dXV1dXV/9sAQwEhIyM2MjZdMjJd35d8l9/f39/f39/f39/f39/f39/f39" +
      "/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f/90ABAAB/9oADAMBAAIRAxEAPwCS" +
      "iiivQJP/2Q==",
    "base64",
  ),
);
const WHOLE_WEBP = Uint8Array.from(
  Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"),
);
const WHOLE_IMAGES = [
  ["image/png", WHOLE_PNG],
  ["image/jpeg", WHOLE_JPEG],
  ["image/webp", WHOLE_WEBP],
] as const;

test("the kind of image is read from the bytes", () => {
  assert.equal(sniffLogoContentType(Uint8Array.from(PNG)), "image/png");
  assert.equal(sniffLogoContentType(Uint8Array.from(JPEG)), "image/jpeg");
  assert.equal(sniffLogoContentType(Uint8Array.from(WEBP)), "image/webp");
});

test("anything else is not a logo, SVG and HTML included", () => {
  const encoder = new TextEncoder();

  for (const bytes of [
    encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
    encoder.encode("<!doctype html><script>alert(1)</script>"),
    encoder.encode("GIF89a"),
    encoder.encode("%PDF-1.7"),
    // A RIFF file that is not WebP (a WAV sound).
    Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
    ]),
    Uint8Array.from([0x89, 0x50]),
  ]) {
    assert.equal(sniffLogoContentType(bytes), null);
    assert.throws(() => checkLogoUpload(bytes), BrandLogoError);
  }
});

test("an empty or oversized upload is refused with a reason", () => {
  assert.throws(
    () => checkLogoUpload(new Uint8Array()),
    (error: unknown) =>
      error instanceof BrandLogoError && error.statusCode === 400,
  );

  const tooLarge = new Uint8Array(MAX_LOGO_BYTES + 1);

  tooLarge.set(PNG);
  assert.throws(
    () => checkLogoUpload(tooLarge),
    (error: unknown) =>
      error instanceof BrandLogoError && error.statusCode === 413,
  );

  const largest = new Uint8Array(MAX_LOGO_BYTES);

  largest.set(WHOLE_PNG);
  assert.equal(checkLogoUpload(largest), "image/png");
});

test("a whole image is taken as what it is", () => {
  for (const [contentType, bytes] of WHOLE_IMAGES) {
    assert.equal(checkLogoUpload(bytes), contentType);
  }
});

test("an image cut off anywhere is refused, though it starts right", () => {
  for (const [contentType, bytes] of WHOLE_IMAGES) {
    for (let length = 1; length < bytes.length; length += 1) {
      const cut = bytes.subarray(0, length);

      assert.throws(
        () => checkLogoUpload(cut),
        (error: unknown) =>
          error instanceof BrandLogoError && error.statusCode === 400,
        `${contentType} cut to ${length} bytes`,
      );
    }
  }
});

test("a PNG with a damaged byte is refused", () => {
  // Flip a byte inside IDAT so only the CRC can catch it.
  const damaged = Uint8Array.from(WHOLE_PNG);

  damaged[45] ^= 0xff;
  assert.equal(sniffLogoContentType(damaged), "image/png");
  assert.throws(() => checkLogoUpload(damaged), BrandLogoError);
});
