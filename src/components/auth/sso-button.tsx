"use client";

import { useState } from "react";

import { ShellButton } from "@/components/shared/form-shell";
import type { AppMessages } from "@/lib/i18n/app-messages";
import { useAppMessages } from "@/lib/i18n/use-app-messages";

// "Continue with <provider>": hands the visitor to the organization's
// identity provider (lib/auth/sso.ts). Better Auth sends them back to
// /api/auth/callback/sso, and from there to the dashboard, or to the sign-in
// page with ?error= when it did not work.

export type SsoOption = { name: string };

/** What the sign-in page says for an ?error= the provider callback sent. */
export function describeSsoError(code: string, m: AppMessages): string {
  switch (code) {
    case "signup_closed":
    case "signup_domain_not_allowed":
      return m.sso.signupNotAllowed;
    case "access_denied":
      return m.sso.cancelled;
    case "email_not_found":
      return m.sso.emailNotFound;
    case "unable_to_link_account":
    case "email_not_verified":
      return m.sso.emailNotVerified;
    case "account_already_linked_to_different_user":
      return m.sso.linkedToOtherUser;
    default:
      return m.sso.failed;
  }
}

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
  const m = useAppMessages();
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
        onError(describeSsoError("", m));
        setIsBusy(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      onError(describeSsoError("", m));
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
      {label ?? m.sso.continueWith(sso.name)}
    </ShellButton>
  );
}
