"use client";

import { useState } from "react";

import { ShellButton } from "@/components/shared/form-shell";
import { useEnvelopeMessages } from "@/lib/i18n/use-envelope-messages";

export function RenewDownloadButton({ token }: { token: string }) {
  const { common, download: messages } = useEnvelopeMessages();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; maskedEmail: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleClick() {
    setState({ kind: "sending" });

    try {
      const response = await fetch(
        `/api/download/${encodeURIComponent(token)}/renew`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        maskedEmail?: string;
      } | null;

      if (!response.ok || !payload?.maskedEmail) {
        setState({
          kind: "error",
          message: payload?.error ?? messages.couldNotSend,
        });
        return;
      }

      setState({ kind: "sent", maskedEmail: payload.maskedEmail });
    } catch {
      setState({
        kind: "error",
        message: messages.couldNotSend,
      });
    }
  }

  return (
    <div className="space-y-4">
      {state.kind === "sent" ? (
        <p role="status" className="notice notice-success">
          {messages.sent(state.maskedEmail)}
        </p>
      ) : (
        <ShellButton loading={state.kind === "sending"} onClick={handleClick}>
          {state.kind === "sending" ? common.sending : messages.button}
        </ShellButton>
      )}
      {state.kind === "error" ? (
        <p role="alert" className="notice notice-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
