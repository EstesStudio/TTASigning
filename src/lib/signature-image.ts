// Browser-only: makes an uploaded image the same transparent, size-capped PNG a drawn signature is.

import { MAX_DRAWN_SIGNATURE_BYTES } from "./schemas/field.ts";

const MAX_WIDTH = 900;
const MAX_HEIGHT = 300;
// A pixel at least this light (0-255, on its darkest channel) is paper.
const PAPER_LIGHTNESS = 200;
// Between ink and paper, a pixel fades out instead of being cut off.
const INK_LIGHTNESS = 120;

export class SignatureImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new SignatureImageError("This file is not an image we can read."));
    };
    image.src = url;
  });
}

/** Paper becomes transparent; returns the ink's bounds, or null without ink. */
export function clearPaper(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { bottom: number; left: number; right: number; top: number } | null {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const lightness = Math.min(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      );
      const inkAlpha =
        lightness >= PAPER_LIGHTNESS
          ? 0
          : lightness <= INK_LIGHTNESS
            ? 1
            : (PAPER_LIGHTNESS - lightness) / (PAPER_LIGHTNESS - INK_LIGHTNESS);
      const alpha = Math.round(pixels[offset + 3] * inkAlpha);

      pixels[offset + 3] = alpha;

      if (alpha > 32) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return right < 0 ? null : { bottom, left, right, top };
}

function toPngDataUrl(source: HTMLCanvasElement, scale: number): string {
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

  return Math.floor((base64.length * 3) / 4);
}

export async function signatureImageFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new SignatureImageError("Choose an image file (PNG or JPEG).");
  }

  const image = await loadImage(file);
  const scale = Math.min(
    1,
    (MAX_WIDTH * 2) / image.naturalWidth,
    (MAX_HEIGHT * 2) / image.naturalHeight,
  );
  const work = document.createElement("canvas");

  work.width = Math.max(1, Math.round(image.naturalWidth * scale));
  work.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = work.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new SignatureImageError("This browser cannot prepare the image.");
  }

  context.drawImage(image, 0, 0, work.width, work.height);

  const data = context.getImageData(0, 0, work.width, work.height);
  const bounds = clearPaper(data.data, work.width, work.height);

  if (!bounds) {
    throw new SignatureImageError(
      "No signature found in this image. Use dark ink on light paper.",
    );
  }

  context.putImageData(data, 0, 0);

  const padding = 8;
  const cropLeft = Math.max(0, bounds.left - padding);
  const cropTop = Math.max(0, bounds.top - padding);
  const cropped = document.createElement("canvas");

  cropped.width = Math.min(work.width, bounds.right + padding + 1) - cropLeft;
  cropped.height = Math.min(work.height, bounds.bottom + padding + 1) - cropTop;
  cropped.getContext("2d")!.drawImage(work, -cropLeft, -cropTop);

  let fit = Math.min(1, MAX_WIDTH / cropped.width, MAX_HEIGHT / cropped.height);
  let dataUrl = toPngDataUrl(cropped, fit);

  while (dataUrlBytes(dataUrl) > MAX_DRAWN_SIGNATURE_BYTES && fit > 0.1) {
    fit *= 0.75;
    dataUrl = toPngDataUrl(cropped, fit);
  }

  if (dataUrlBytes(dataUrl) > MAX_DRAWN_SIGNATURE_BYTES) {
    throw new SignatureImageError(
      "This image is too detailed. Crop it to the signature.",
    );
  }

  return dataUrl;
}
