"use client";

import { useState } from "react";

import { useBranding } from "@/components/layout/branding-provider";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { ShellButton } from "@/components/shared/form-shell";
import { useAppMessages } from "@/lib/i18n/use-app-messages";

export function TwoStepSetupRequired({ email }: { email: string }) {
  const { productName } = useBranding();
  const m = useAppMessages();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        body: "{}",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="w-full max-w-[720px] space-y-5">
      <section className="panel space-y-3 p-8 sm:p-10">
        <p className="section-eyebrow">{m.twoStepSetup.eyebrow}</p>
        <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
          {m.twoStepSetup.title}
        </h1>
        <p className="text-sm leading-6 text-(--secondary)">
          {m.twoStepSetup.description(productName, email)}
        </p>
      </section>

      <TwoFactorPanel enabled={false} required />

      <ShellButton
        className="w-fit"
        loading={isSigningOut}
        onClick={() => void signOut()}
        variant="ghost"
      >
        {m.common.signOut}
      </ShellButton>
    </div>
  );
}
