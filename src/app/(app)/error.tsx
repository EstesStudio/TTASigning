"use client";

import { StatusPanel } from "@/components/shared/status-panel";
import { useEnvelopeMessages } from "@/lib/i18n/use-envelope-messages";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const messages = useEnvelopeMessages().pages;

  return (
    <StatusPanel
      description={messages.appErrorDescription}
      footer={
        <button
          className="btn-quiet min-h-11 px-5"
          onClick={reset}
          type="button"
        >
          {messages.tryAgain}
        </button>
      }
      title={messages.appErrorTitle}
      tone="error"
    />
  );
}
