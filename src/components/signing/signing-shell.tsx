"use client";

import type { SigningUnavailableState } from "@/lib/i18n/signing-messages";
import { useSigningMessages } from "@/lib/i18n/use-signing-messages";
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

type SigningShellProps = {
  initialState?: SigningUnavailableState;
  record?: SigningPayload;
  /** Set when the signer came back from a signing provider without signing. */
  signatureProblem?: ProviderSignatureProblem | null;
  token: string;
  verification?: SigningVerificationState;
};

export function SigningShell({
  initialState,
  record,
  signatureProblem,
  token,
  verification,
}: SigningShellProps) {
  const messages = useSigningMessages();

  if (record) {
    return (
      <SigningLiveShell record={record} signatureProblem={signatureProblem} />
    );
  }

  if (verification) {
    return <SignerVerificationScreen state={verification} token={token} />;
  }

  const tokenState = messages.unavailable[initialState ?? "error"];

  return (
    <SigningStateScreen
      description={tokenState.description}
      title={tokenState.title}
    />
  );
}
