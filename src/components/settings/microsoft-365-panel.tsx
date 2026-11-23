"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import type { GraphField } from "@/lib/email-graph-settings";
import { buildExchangeCommands } from "@/lib/exchange-commands";
import type { EmailStatus } from "@/lib/email-status";

// The Microsoft 365 part of Email setup, shown with EMAIL_DRIVER=graph: the
// credentials of the app registration, the Exchange PowerShell that lets it
// send from one mailbox only, and a check of what it was really granted.

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const API_PATH = "/api/admin/email/microsoft";

type GraphView = {
  fromEnv: Record<GraphField, boolean>;
  missing: GraphField[];
  secretUnreadable: boolean;
  values: {
    clientId: string | null;
    clientSecretSet: boolean;
    sender: string | null;
    tenantId: string | null;
  };
};

type PermissionCheck =
  | { message: string; signedIn: false }
  | { roles: string[]; signedIn: true; tenantWideMailSend: boolean };

type TestResult = { sent: true; to: string } | { message: string; sent: false };

type ApiResponse = {
  error?: string;
  fieldErrors?: Partial<Record<GraphField, string>>;
  permissions?: PermissionCheck;
  settings?: GraphView;
  status?: EmailStatus;
  test?: TestResult | null;
} | null;

type FormValues = Record<GraphField, string>;

const VARIABLES: Record<GraphField, string> = {
  clientId: "MICROSOFT_GRAPH_CLIENT_ID",
  clientSecret: "MICROSOFT_GRAPH_CLIENT_SECRET",
  sender: "MICROSOFT_GRAPH_SENDER",
  tenantId: "MICROSOFT_GRAPH_TENANT_ID",
};

function toForm(view: GraphView): FormValues {
  return {
    clientId: view.values.clientId ?? "",
    clientSecret: "",
    sender: view.values.sender ?? "",
    tenantId: view.values.tenantId ?? "",
  };
}

export function Microsoft365Panel({
  onStatus,
}: {
  onStatus: (status: EmailStatus) => void;
}) {
  const [view, setView] = useState<GraphView | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<GraphField, string>>>({});
  const [pending, setPending] = useState<"remove" | "save" | "verify" | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success" | "warning";
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(API_PATH, { signal: controller.signal })
      .then((response) => response.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (payload?.settings) {
          setView(payload.settings);
          setValues(toForm(payload.settings));
        } else {
          setFeedback({
            message: payload?.error ?? GENERIC_ERROR_MESSAGE,
            tone: "error",
          });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFeedback({ message: GENERIC_ERROR_MESSAGE, tone: "error" });
        }
      });

    return () => controller.abort();
  }, []);

  async function call(
    action: "remove" | "save" | "verify",
    init: RequestInit,
  ): Promise<ApiResponse> {
    setPending(action);
    setFeedback(null);

    try {
      const response = await fetch(API_PATH, {
        ...init,
        headers: { "content-type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse;

      if (payload?.settings) {
        setView(payload.settings);
        setValues(toForm(payload.settings));
      }

      if (payload?.status) {
        onStatus(payload.status);
      }

      setErrors(payload?.fieldErrors ?? {});

      if (!response.ok && !payload?.fieldErrors) {
        setFeedback({
          message: payload?.error ?? GENERIC_ERROR_MESSAGE,
          tone: "error",
        });
      }

      return response.ok ? payload : null;
    } catch {
      setFeedback({ message: GENERIC_ERROR_MESSAGE, tone: "error" });

      return null;
    } finally {
      setPending(null);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values || pending) {
      return;
    }

    const payload = await call("save", {
      body: JSON.stringify(values),
      method: "PUT",
    });

    if (payload) {
      setFeedback({
        message:
          "Saved. Verify the connection to check that Microsoft lets the app send from the mailbox.",
        tone: "success",
      });
    }
  }

  async function handleVerify() {
    if (pending) {
      return;
    }

    const payload = await call("verify", {
      body: JSON.stringify({ action: "verify" }),
      method: "POST",
    });

    if (!payload?.permissions) {
      return;
    }

    if (!payload.permissions.signedIn) {
      setFeedback({ message: payload.permissions.message, tone: "error" });

      return;
    }

    const sent = payload.test?.sent
      ? `Test email sent to ${payload.test.to}.`
      : `Signed in, but the test email failed: ${payload.test?.message ?? GENERIC_ERROR_MESSAGE}`;

    setFeedback(
      payload.permissions.tenantWideMailSend
        ? {
            message: `${sent} Warning: this app was granted Mail.Send for the whole organization in Entra, so it can send as anyone in it, not only from its mailbox. Remove that permission (and its admin consent) under App registrations, API permissions, and keep only the Exchange role assignment.`,
            tone: "warning",
          }
        : {
            message: payload.test?.sent
              ? `${sent} The app has no organization-wide Mail.Send: it can only send where Exchange allows it.`
              : sent,
            tone: payload.test?.sent ? "success" : "error",
          },
    );
  }

  async function handleRemove() {
    if (pending) {
      return;
    }

    const payload = await call("remove", { method: "DELETE" });

    if (payload) {
      setFeedback({
        message: "The stored credentials were removed.",
        tone: "success",
      });
    }
  }

  function handleChange(field: GraphField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) =>
        current ? { ...current, [field]: event.target.value } : current,
      );
      setErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  async function copyCommands(commands: string) {
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!view || !values) {
    return feedback ? (
      <p className="notice notice-danger" role="alert">
        {feedback.message}
      </p>
    ) : (
      <p className="text-sm text-(--secondary)">Loading Microsoft 365…</p>
    );
  }

  const everyFieldFromEnv = Object.values(view.fromEnv).every(Boolean);
  const hasStored =
    (!view.fromEnv.tenantId && view.values.tenantId !== null) ||
    (!view.fromEnv.clientId && view.values.clientId !== null) ||
    (!view.fromEnv.clientSecret && view.values.clientSecretSet);
  const commands = buildExchangeCommands(values);
  const helper = (field: GraphField, text: string) =>
    view.fromEnv[field]
      ? `Set by the ${VARIABLES[field]} environment variable.`
      : text;

  return (
    <div className="space-y-5" id="microsoft-365">
      <h4 className="text-base font-bold text-(--fg)">Microsoft 365</h4>

      {view.secretUnreadable ? (
        <p className="notice notice-danger" role="alert">
          The stored client secret can no longer be read, because
          BETTER_AUTH_SECRET has changed since it was saved. Enter the client
          secret again.
        </p>
      ) : null}

      {everyFieldFromEnv ? (
        <p className="text-sm leading-6 text-(--secondary)">
          Every Microsoft 365 setting comes from an environment variable, so
          there is nothing to enter here.
        </p>
      ) : (
        <form className="space-y-4" noValidate onSubmit={handleSave}>
          <p className="text-sm leading-6 text-(--secondary)">
            Register an app in the Microsoft Entra admin center (single tenant,
            no redirect URI), add a client secret, and enter its details here.
            Do not grant it the Mail.Send permission in Entra: the commands
            below allow it to send from one mailbox only.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell
              disabled={pending !== null || view.fromEnv.tenantId}
              error={errors.tenantId}
              helper={helper(
                "tenantId",
                "Directory (tenant) ID, on the app registration's overview.",
              )}
              label="Tenant ID"
              name="graph-tenant-id"
              onChange={handleChange("tenantId")}
              placeholder="00000000-0000-0000-0000-000000000000"
              readOnly={view.fromEnv.tenantId}
              value={values.tenantId}
            />
            <FieldShell
              disabled={pending !== null || view.fromEnv.clientId}
              error={errors.clientId}
              helper={helper(
                "clientId",
                "Application (client) ID, on the same page.",
              )}
              label="Client ID"
              name="graph-client-id"
              onChange={handleChange("clientId")}
              placeholder="00000000-0000-0000-0000-000000000000"
              readOnly={view.fromEnv.clientId}
              value={values.clientId}
            />
            <FieldShell
              autoComplete="off"
              disabled={pending !== null || view.fromEnv.clientSecret}
              error={errors.clientSecret}
              helper={helper(
                "clientSecret",
                view.values.clientSecretSet
                  ? "A secret is saved. Leave this empty to keep it. It is stored encrypted with BETTER_AUTH_SECRET: if that changes, enter the secret again."
                  : "The secret's value, not its ID. It is stored encrypted with BETTER_AUTH_SECRET: if that changes, enter the secret again.",
              )}
              ignorePasswordManagers
              label="Client secret"
              name="graph-client-secret"
              onChange={handleChange("clientSecret")}
              placeholder={view.values.clientSecretSet ? "••••••••" : ""}
              readOnly={view.fromEnv.clientSecret}
              type="password"
              value={view.fromEnv.clientSecret ? "" : values.clientSecret}
            />
            <FieldShell
              disabled={pending !== null || view.fromEnv.sender}
              error={errors.sender}
              helper={helper(
                "sender",
                'The mailbox email goes out from, such as a shared mailbox. It is also the "Send email from" address above.',
              )}
              label="Mailbox"
              name="graph-sender"
              onChange={handleChange("sender")}
              placeholder="sign@yourcompany.com"
              readOnly={view.fromEnv.sender}
              type="email"
              value={values.sender}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ShellButton
              disabled={pending !== null}
              loading={pending === "save"}
              type="submit"
            >
              {pending === "save" ? "Saving..." : "Save Microsoft 365 settings"}
            </ShellButton>
            {hasStored ? (
              <ShellButton
                disabled={pending !== null}
                loading={pending === "remove"}
                onClick={() => void handleRemove()}
                variant="ghost"
              >
                {pending === "remove"
                  ? "Removing..."
                  : "Remove saved credentials"}
              </ShellButton>
            ) : null}
          </div>
        </form>
      )}

      <div className="space-y-2">
        <p className="text-sm leading-6 text-(--secondary)">
          An Exchange administrator runs these commands in PowerShell, with the
          ExchangeOnlineManagement module, so the app may send from the mailbox
          and from no other. They can take up to an hour to apply.
        </p>
        <pre className="overflow-x-auto rounded-2xl bg-(--surface) px-4 py-3 text-xs leading-5 text-(--fg)">
          <code>{commands}</code>
        </pre>
        <ShellButton
          onClick={() => void copyCommands(commands)}
          variant="ghost"
        >
          {copied ? "Copied" : "Copy commands"}
        </ShellButton>
      </div>

      <div className="space-y-2">
        <ShellButton
          disabled={pending !== null || view.missing.length > 0}
          loading={pending === "verify"}
          onClick={() => void handleVerify()}
          variant="secondary"
        >
          {pending === "verify" ? "Verifying..." : "Verify connection"}
        </ShellButton>
        <p className="text-sm leading-6 text-(--secondary)">
          Signs in as the app, checks that it was not granted Mail.Send for the
          whole organization, and sends you a test email from the mailbox.
        </p>
      </div>

      {feedback ? (
        <p
          className={`notice ${
            feedback.tone === "success"
              ? "notice-success"
              : feedback.tone === "warning"
                ? "notice-warning"
                : "notice-danger"
          }`}
          role={feedback.tone === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
