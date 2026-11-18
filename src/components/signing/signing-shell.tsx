"use client";

import { type SignerLocale, t, type SignerMessageKey } from "@/lib/i18n";
import type {
  SigningPayload,
  SigningVerificationState,
} from "@/lib/schemas/signing";
import { SignerVerificationScreen } from "./signer-verification-screen";
import { SigningStateScreen } from "./signing-state-screen";
import {
  SigningLiveShell,
  type ProviderSignatureProblem,
} from "./signing-live-shell";

type SigningUnavailableState =
  "already-signed" | "declined" | "error" | "expired" | "voided";

type SigningShellProps = {
  initialState?: SigningUnavailableState;
  /** The language the organization chose for its signers. */
  locale?: SignerLocale;
  record?: SigningPayload;
  /** Set when the signer came back from a signing provider without signing. */
  signatureProblem?: ProviderSignatureProblem | null;
  token: string;
  verification?: SigningVerificationState;
};

const tokenStateCopy: Record<
  SigningUnavailableState,
  { description: SignerMessageKey; title: SignerMessageKey }
> = {
  error: {
    title: "state.error.title",
    description: "state.error.description",
  },
  expired: {
    title: "state.expired.title",
    description: "state.expired.description",
  },
  "already-signed": {
    title: "state.alreadySigned.title",
    description: "state.alreadySigned.description",
  },
  voided: {
    title: "state.voided.title",
    description: "state.voided.description",
  },
  declined: {
    title: "state.declined.title",
    description: "state.declined.description",
  },
};

export function SigningShell({
  initialState,
  locale = "en",
  record,
  signatureProblem,
  token,
  verification,
}: SigningShellProps) {
  if (record) {
    return (
      <SigningLiveShell
        locale={locale}
        record={record}
        signatureProblem={signatureProblem}
      />
    );
  }

  if (verification) {
    return (
      <SignerVerificationScreen
        locale={locale}
        state={verification}
        token={token}
      />
    );
  }

  const tokenState = tokenStateCopy[initialState ?? "error"];

  return (
    <SigningStateScreen
      description={t(locale, tokenState.description)}
      locale={locale}
      title={t(locale, tokenState.title)}
    />
  );
}
