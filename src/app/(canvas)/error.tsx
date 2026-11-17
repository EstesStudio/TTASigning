"use client";

import { StatusPanel } from "@/components/shared/status-panel";
import { useEnvelopeMessages } from "@/lib/i18n/use-envelope-messages";

export default function CanvasError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const messages = useEnvelopeMessages().pages;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <StatusPanel
        description={messages.canvasErrorDescription}
        footer={
          <button
            className="btn-quiet min-h-11 px-5"
            onClick={reset}
            type="button"
          >
            {messages.reloadCanvas}
          </button>
        }
        title={messages.canvasErrorTitle}
        tone="error"
      />
    </div>
  );
}
