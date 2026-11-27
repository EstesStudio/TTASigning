"use client";

import { useState } from "react";

import { ShellButton } from "@/components/shared/form-shell";
import { describeSsoError } from "@/lib/auth/sso-errors";

// "Continue with <provider>": hands the visitor to the organization's
// identity provider (lib/auth/sso.ts). Better Auth sends them back to
// /api/auth/callback/sso, and from there to the dashboard, or to the sign-in
// page with ?error= when it did not work.

export { describeSsoError } from "@/lib/auth/sso-errors";
export type SsoOption = { name: string };

export function SsoButton({
  label,
  onError,
  sso,
  variant = "primary",
}: {
  label?: string;
  onError: (message: string) => void;
  sso: SsoOption;
  variant?: "primary" | "secondary";
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function start() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const origin = window.location.origin;
      const response = await fetch("/api/auth/sign-in/social", {
        body: JSON.stringify({
          callbackURL: `${origin}/dashboard`,
          errorCallbackURL: `${origin}/login`,
          newUserCallbackURL: `${origin}/dashboard`,
          provider: "sso",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        onError(describeSsoError(""));
        setIsBusy(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      onError(describeSsoError(""));
      setIsBusy(false);
    }
  }

  return (
    <ShellButton
      className="w-full"
      loading={isBusy}
      onClick={() => void start()}
      type="button"
      variant={variant}
    >
      {label ?? `Continue with ${sso.name}`}
    </ShellButton>
  );
}
