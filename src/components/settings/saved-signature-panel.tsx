"use client";

import { useState } from "react";

import { ShellButton } from "@/components/shared/form-shell";
import {
  SignatureImageError,
  signatureImageFromFile,
} from "@/lib/signature-image";

export function SavedSignaturePanel({
  initialSignature,
}: {
  initialSignature: string | null;
}) {
  const [signature, setSignature] = useState(initialSignature);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      const imageDataUrl = await signatureImageFromFile(file);
      const response = await fetch("/api/account/signature", {
        body: JSON.stringify({ imageDataUrl }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        setError(payload?.error ?? "We couldn't save your signature.");
        return;
      }

      setSignature(imageDataUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof SignatureImageError
          ? uploadError.message
          : "We couldn't save your signature.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setIsBusy(true);

    const response = await fetch("/api/account/signature", {
      method: "DELETE",
    }).catch(() => null);

    setIsBusy(false);

    if (response?.ok) {
      setSignature(null);
    } else {
      setError("We couldn't remove your signature.");
    }
  }

  return (
    <section className="panel space-y-5 p-6 sm:p-8">
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--fg)">
        Signature
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
        Upload a photo or scan of your signature, dark ink on light paper. It is
        offered when you sign a document sent to your account&apos;s address
        while signed in.
      </p>
      {signature ? (
        <div className="flex h-[140px] max-w-md items-center justify-center rounded-xl border border-(--border-strong) bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
          <img
            alt="Your saved signature"
            className="max-h-full max-w-full object-contain"
            src={signature}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="block">
          <span className="sr-only">Choose a signature image</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-(--secondary) file:mr-3 file:rounded-lg file:border-0 file:bg-(--surface-strong) file:px-3 file:py-2 file:text-sm file:font-semibold"
            disabled={isBusy}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        {signature ? (
          <ShellButton
            disabled={isBusy}
            onClick={() => void handleRemove()}
            variant="secondary"
          >
            Remove
          </ShellButton>
        ) : null}
      </div>
      {error ? (
        <p className="notice notice-warning max-w-2xl" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
