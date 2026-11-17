"use client";

import { useState } from "react";

import { useSettingsMessages } from "@/lib/i18n/use-settings-messages";

// Part 11 mode. Administrators only. The install's audit trail is in the
// security panel.

export function Part11Panel({ initialEnabled }: { initialEnabled: boolean }) {
  const t = useSettingsMessages();
  const enabled = initialEnabled;
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function changeMode(next: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/part11", {
        body: JSON.stringify({ enabled: next }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        part11Mode?: boolean;
      } | null;

      if (!response.ok || typeof payload?.part11Mode !== "boolean") {
        setError(payload?.error ?? t.common.genericError);
        return;
      }

      // The People list and the retention field depend on the mode.
      window.location.reload();
    } catch {
      setError(t.common.genericError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5 border-t border-(--border) pt-8" id="part11">
      <div className="space-y-2">
        <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
          {t.part11.heading}
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.part11.description}
        </p>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          {t.part11.disclaimer}
        </p>
      </div>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className={`pill ${enabled ? "pill-success" : "pill-neutral"}`}>
          {enabled ? t.common.on : t.common.off}
        </span>
        <button
          className={enabled ? "btn-quiet btn-quiet-danger" : "btn-quiet"}
          disabled={isSaving}
          onClick={() => void changeMode(!enabled)}
          type="button"
        >
          {isSaving
            ? t.common.saving
            : enabled
              ? t.part11.turnOff
              : t.part11.turnOn}
        </button>
      </div>
    </div>
  );
}
