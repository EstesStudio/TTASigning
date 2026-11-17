"use client";

import { useState } from "react";

import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { useSettingsMessages } from "@/lib/i18n/use-settings-messages";

// Answers a signer who asks what is stored about them, or for it to be
// erased. Administrators only.

type ErasureResult = {
  deletedEnvelopes: number;
  removedFromDrafts: number;
  keptPart11?: { id: string; title: string }[];
  skippedInProgress: { id: string; title: string }[];
};

export function SignerDataPanel() {
  const t = useSettingsMessages();
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isErasing, setIsErasing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    tone: "error" | "success";
  } | null>(null);
  const trimmed = email.trim();
  const exportHref = `/api/admin/signer-data?email=${encodeURIComponent(trimmed)}`;

  async function erase() {
    setIsErasing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/signer-data", {
        body: JSON.stringify({ confirmation, email: trimmed }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        (ErasureResult & { error?: string }) | null;

      if (!response.ok || !payload) {
        setMessage({
          text: payload?.error ?? t.signerData.failed,
          tone: "error",
        });
        return;
      }

      const skipped = payload.skippedInProgress.length
        ? t.signerData.skipped(payload.skippedInProgress.length)
        : "";
      const kept = payload.keptPart11?.length
        ? t.signerData.kept(payload.keptPart11.length)
        : "";

      setMessage({
        text: `${t.signerData.erased(payload.deletedEnvelopes, payload.removedFromDrafts)}${skipped}${kept}`,
        tone: "success",
      });
      setConfirmation("");
    } catch {
      setMessage({
        text: t.signerData.failed,
        tone: "error",
      });
    } finally {
      setIsErasing(false);
    }
  }

  return (
    <div className="space-y-5 border-t border-(--border) pt-8">
      <div className="space-y-2">
        <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
          {t.signerData.heading}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.signerData.description}
        </p>
      </div>
      <div className="grid max-w-xl gap-4">
        <FieldShell
          label={t.signerData.emailLabel}
          name="signer-data-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.signerData.emailPlaceholder}
          readOnly={false}
          type="email"
          value={email}
        />
        <a
          aria-disabled={trimmed.length === 0}
          className={`btn-quiet min-h-12 w-fit px-5 text-sm ${
            trimmed.length === 0 ? "pointer-events-none" : ""
          }`}
          download
          href={exportHref}
        >
          {t.signerData.download}
        </a>
        <FieldShell
          helper={t.signerData.confirmHelper}
          label={t.signerData.confirmLabel}
          name="signer-data-confirm"
          onChange={(event) => setConfirmation(event.target.value)}
          readOnly={false}
          value={confirmation}
        />
        <ShellButton
          className="w-fit border-[rgba(180,35,24,0.35)] text-(--danger) hover:border-(--danger) hover:bg-(--danger-soft) hover:text-(--danger)"
          disabled={
            trimmed.length === 0 ||
            confirmation.trim().toLowerCase() !== trimmed.toLowerCase()
          }
          loading={isErasing}
          onClick={erase}
          variant="secondary"
        >
          {t.signerData.erase}
        </ShellButton>
        {message ? (
          <p
            className={`notice ${
              message.tone === "error" ? "notice-danger" : "notice-success"
            }`}
            role={message.tone === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
