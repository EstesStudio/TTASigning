"use client";

import { StatusPanel } from "@/components/shared/status-panel";
import { useAppMessages } from "@/lib/i18n/use-app-messages";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const m = useAppMessages();

  return (
    <div className="w-full max-w-[520px]">
      <StatusPanel
        description={m.authShell.errorDescription}
        footer={
          <button
            className="btn-quiet min-h-11 px-5"
            onClick={reset}
            type="button"
          >
            {m.authShell.tryAgain}
          </button>
        }
        title={m.authShell.errorTitle}
        tone="error"
      />
    </div>
  );
}
