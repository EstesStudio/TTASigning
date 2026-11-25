"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import type { EmailStatus } from "@/lib/email-status";
import type { SmtpField, SmtpSettingsView } from "@/lib/smtp-settings";

// The SMTP server, in Email setup on the Organization tab, for an install
// that sends with EMAIL_DRIVER=smtp. A field set by an SMTP_* environment
// variable is shown but cannot be changed here. The saved password is never
// shown: the field only replaces it.

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

type Encryption = "port" | "starttls" | "tls";

type FormValues = {
  encryption: Encryption;
  host: string;
  password: string;
  port: string;
  user: string;
};

type SmtpResponse = {
  error?: string;
  fieldErrors?: Partial<Record<SmtpField, string>>;
  smtp?: SmtpSettingsView;
  status?: EmailStatus;
} | null;

function toFormValues(view: SmtpSettingsView): FormValues {
  return {
    encryption:
      view.secure === null ? "port" : view.secure ? "tls" : "starttls",
    host: view.host ?? "",
    password: "",
    port: view.port === null ? "" : String(view.port),
    user: view.user ?? "",
  };
}

function envHelper(field: SmtpField): string {
  return `Set by the SMTP_${field.toUpperCase()} environment variable.`;
}

function passwordHelper(view: SmtpSettingsView): string {
  if (view.fromEnv.password) {
    return envHelper("password");
  }

  if (view.password === "unreadable") {
    return "The saved password can no longer be read, because BETTER_AUTH_SECRET has changed. Enter it again.";
  }

  return view.password === "saved"
    ? "A password is saved. Leave this empty to keep it."
    : "Kept encrypted, and never shown again once saved.";
}

export function SmtpServerForm({
  onSaved,
}: {
  onSaved: (status: EmailStatus) => void;
}) {
  const [view, setView] = useState<SmtpSettingsView | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<SmtpField, string>>>({});
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/email/smtp", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as SmtpResponse;

        if (!response.ok || !payload?.smtp) {
          setFeedback({
            message: payload?.error ?? GENERIC_ERROR_MESSAGE,
            tone: "error",
          });
          return;
        }

        setView(payload.smtp);
        setValues(toFormValues(payload.smtp));
      })
      .catch((error: unknown) => {
        // Leaving the page cancels the request; that is not a failure.
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFeedback({ message: GENERIC_ERROR_MESSAGE, tone: "error" });
        }
      });

    return () => controller.abort();
  }, []);

  function setField(field: keyof FormValues, value: string) {
    setValues((current) => (current ? { ...current, [field]: value } : null));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!view || !values || isSaving) {
      return;
    }

    const port = values.port.trim();

    if (port !== "" && !/^\d+$/.test(port)) {
      setErrors({ port: "Enter a port between 1 and 65535" });
      return;
    }

    // Only what this page may change: the environment's values stay theirs.
    const body: Record<string, unknown> = {
      ...(view.fromEnv.host ? {} : { host: values.host }),
      ...(view.fromEnv.port ? {} : { port: port === "" ? null : Number(port) }),
      ...(view.fromEnv.secure
        ? {}
        : {
            secure:
              values.encryption === "port" ? null : values.encryption === "tls",
          }),
      ...(view.fromEnv.user ? {} : { user: values.user }),
      ...(view.fromEnv.password || values.password === ""
        ? {}
        : { password: values.password }),
    };

    setErrors({});
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/email/smtp", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as SmtpResponse;

      if (!response.ok || !payload?.smtp) {
        setErrors(payload?.fieldErrors ?? {});
        setFeedback({
          message: payload?.error ?? GENERIC_ERROR_MESSAGE,
          tone: "error",
        });
        return;
      }

      setView(payload.smtp);
      setValues(toFormValues(payload.smtp));
      setFeedback({ message: "SMTP server saved.", tone: "success" });

      if (payload.status) {
        onSaved(payload.status);
      }
    } catch {
      setFeedback({ message: GENERIC_ERROR_MESSAGE, tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-[0.9375rem] font-bold text-(--fg)">SMTP server</h4>
        <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
          The server this site sends email through. A value set by an SMTP_
          environment variable is shown here and can only be changed there. The
          password is kept encrypted with a key made from BETTER_AUTH_SECRET: if
          that secret changes, enter the password again.
        </p>
      </div>

      {view && values ? (
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell
              disabled={isSaving || view.fromEnv.host}
              error={errors.host}
              helper={view.fromEnv.host ? envHelper("host") : undefined}
              label="Server"
              name="smtp-host"
              onChange={(event) => setField("host", event.target.value)}
              placeholder="smtp.yourcompany.com"
              readOnly={view.fromEnv.host}
              value={values.host}
            />
            <FieldShell
              disabled={isSaving || view.fromEnv.port}
              error={errors.port}
              helper={
                view.fromEnv.port
                  ? envHelper("port")
                  : "465 when left empty. Port 587 is the usual other choice."
              }
              label="Port"
              name="smtp-port"
              onChange={(event) => setField("port", event.target.value)}
              placeholder="465"
              readOnly={view.fromEnv.port}
              value={values.port}
            />
            <label className="grid gap-1.5">
              <span className="text-[0.8125rem] font-semibold text-(--secondary)">
                Encryption
              </span>
              <select
                className="field-input"
                disabled={isSaving || view.fromEnv.secure}
                onChange={(event) =>
                  setField("encryption", event.target.value as Encryption)
                }
                value={values.encryption}
              >
                <option value="port">
                  From the port: TLS on 465, STARTTLS on others
                </option>
                <option value="tls">TLS from the start</option>
                <option value="starttls">STARTTLS</option>
              </select>
              {view.fromEnv.secure ? (
                <span className="text-sm text-(--secondary)">
                  {envHelper("secure")}
                </span>
              ) : null}
            </label>
            <FieldShell
              disabled={isSaving || view.fromEnv.user}
              error={errors.user}
              helper={view.fromEnv.user ? envHelper("user") : undefined}
              ignorePasswordManagers
              label="User name"
              name="smtp-user"
              onChange={(event) => setField("user", event.target.value)}
              readOnly={view.fromEnv.user}
              value={values.user}
            />
            <FieldShell
              autoComplete="off"
              disabled={isSaving || view.fromEnv.password}
              error={errors.password}
              helper={passwordHelper(view)}
              ignorePasswordManagers
              label="Password"
              name="smtp-password"
              onChange={(event) => setField("password", event.target.value)}
              placeholder={view.password === "saved" ? "••••••••" : undefined}
              readOnly={view.fromEnv.password}
              type="password"
              value={values.password}
            />
          </div>
          <ShellButton disabled={isSaving} loading={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save SMTP server"}
          </ShellButton>
        </form>
      ) : null}

      {feedback ? (
        <p
          className={`notice ${
            feedback.tone === "success" ? "notice-success" : "notice-danger"
          }`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
