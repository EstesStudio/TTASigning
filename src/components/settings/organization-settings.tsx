"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { LOCALE_NAMES, LOCALES, normalizeLocale } from "@/lib/i18n/locales";
import type { SettingsMessages } from "@/lib/i18n/settings-messages";
import { useSettingsMessages } from "@/lib/i18n/use-settings-messages";
import { LocaleFlag } from "@/components/settings/locale-flag";
import { BrandingPanel } from "@/components/settings/branding-panel";
import { Part11Panel } from "@/components/settings/part11-panel";
import { PeoplePanel } from "@/components/settings/people-panel";
import { SecurityPanel } from "@/components/settings/security-panel";
import { SignerDataPanel } from "@/components/settings/signer-data-panel";
import type { EmailDnsRecord, EmailStatus } from "@/lib/email-status";
import type {
  OrganizationSettingsField,
  OrganizationSettingsView,
} from "@/lib/organization-settings";
import type { SignupMode } from "@/lib/signup-policy";

// The administrator's part of Settings: what the install is called, who can
// sign up, where email comes from, and whether email works yet.

const RESEND_DOMAINS_URL = "https://resend.com/domains";
const RESEND_MARKETPLACE_URL = "https://vercel.com/marketplace/resend";

type OrganizationSettingsProps = {
  initialSettings: OrganizationSettingsView;
};

type FormErrors = Partial<Record<OrganizationSettingsField, string>>;

type Feedback = {
  message: string;
  tone: "error" | "success";
} | null;

type SettingsResponse = {
  error?: string;
  fieldErrors?: FormErrors;
  settings?: OrganizationSettingsView;
} | null;

type EmailResponse = {
  error?: string;
  status?: EmailStatus;
  test?: { sent: true; to: string } | { sent: false; message: string };
} | null;

type EmailAction = "add_domain" | "recheck" | "send_test";

const signupModeOptions: SignupMode[] = ["domains", "closed", "open"];

export function OrganizationSettings({
  initialSettings,
}: OrganizationSettingsProps) {
  const t = useSettingsMessages();
  const GENERIC_ERROR_MESSAGE = t.common.genericError;
  const router = useRouter();
  const [values, setValues] = useState(initialSettings);
  const [errors, setErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Bumped after a save, so the email panel looks again: a new sender
  // address means a different domain to check.
  const [emailRevision, setEmailRevision] = useState(0);

  function handleChange(field: OrganizationSettingsField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({ ...currentValues, [field]: nextValue }));
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
      setFeedback(null);
    };
  }

  function handleBrandColorChange(brandColor: string) {
    setValues((currentValues) => ({ ...currentValues, brandColor }));
    setErrors((currentErrors) => ({ ...currentErrors, brandColor: undefined }));
    setFeedback(null);
  }

  function handleSignupModeChange(signupMode: SignupMode) {
    setValues((currentValues) => ({ ...currentValues, signupMode }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      allowedEmailDomains: undefined,
      signupMode: undefined,
    }));
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setErrors({});
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        body: JSON.stringify({
          allowedEmailDomains: values.allowedEmailDomains,
          brandColor: values.brandColor,
          locale: values.locale,
          organizationName: values.organizationName,
          privacyUrl: values.privacyUrl,
          retentionDays: values.retentionDays,
          senderAddress: values.senderAddress,
          signupMode: values.signupMode,
          supportAddress: values.supportAddress,
          termsUrl: values.termsUrl,
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as SettingsResponse;

      if (!response.ok || !payload?.settings) {
        setErrors(payload?.fieldErrors ?? {});
        setFeedback({
          message: payload?.error ?? GENERIC_ERROR_MESSAGE,
          tone: "error",
        });
        return;
      }

      setValues(payload.settings);
      setEmailRevision((revision) => revision + 1);
      setFeedback({ message: t.organization.saved, tone: "success" });
      // The header and the accent color come from the layout around this
      // page, which only looks them up again when asked to.
      router.refresh();
    } catch {
      setFeedback({ message: GENERIC_ERROR_MESSAGE, tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      className="panel scroll-mt-6 p-6 sm:p-8"
      data-animate="enter"
      data-animate-delay="2"
      id="organization"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="section-eyebrow">{t.common.administrator}</p>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-(--fg)">
            {t.organization.heading}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
            {t.organization.description}
          </p>
        </div>

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

        <form className="space-y-8" noValidate onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell
              disabled={isSaving}
              error={errors.organizationName}
              helper={t.organization.nameHelper}
              label={t.organization.nameLabel}
              name="organization-name"
              onChange={handleChange("organizationName")}
              readOnly={false}
              value={values.organizationName}
            />
          </div>

          {/* The hosted service runs under its own name, mark, color and language. */}
          {!values.hosted ? (
            // Radio buttons rather than a <select>, so each language can show
            // its flag: an option cannot hold an image, and Windows draws flag
            // emoji as two letters.
            <fieldset
              aria-describedby="organization-locale-description"
              className="grid max-w-sm gap-2 text-sm"
              disabled={isSaving}
            >
              <legend className="mb-2 text-[0.8125rem] font-semibold text-(--secondary)">
                {t.organization.languageLabel}
              </legend>
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((locale) => (
                  <label
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-(--surface) px-3.5 py-2 font-semibold text-(--fg) ring-2 ring-transparent transition has-[:checked]:bg-(--accent-softer) has-[:checked]:ring-(--accent) has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--accent)"
                    key={locale}
                    lang={locale}
                  >
                    <input
                      checked={values.locale === locale}
                      className="sr-only"
                      name="organization-locale"
                      onChange={(event) =>
                        setValues((currentValues) => ({
                          ...currentValues,
                          locale: normalizeLocale(event.target.value),
                        }))
                      }
                      type="radio"
                      value={locale}
                    />
                    <LocaleFlag locale={locale} />
                    {LOCALE_NAMES[locale]}
                  </label>
                ))}
              </div>
              <span
                className="text-xs leading-5 text-(--secondary)"
                id="organization-locale-description"
              >
                {t.organization.languageHelper}
              </span>
            </fieldset>
          ) : null}

          {!values.hosted ? (
            <BrandingPanel
              brandColor={values.brandColor}
              brandColorError={errors.brandColor}
              disabled={isSaving}
              logoUrl={values.logoUrl}
              onBrandColorChange={handleBrandColorChange}
              onLogoChange={(logoUrl) =>
                setValues((currentValues) => ({ ...currentValues, logoUrl }))
              }
            />
          ) : null}

          <fieldset className="space-y-4 border-t border-(--border) pt-8">
            <legend className="float-left mb-4 w-full text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
              {t.organization.signupHeading}
            </legend>
            <p className="clear-both max-w-2xl text-sm leading-6 text-(--secondary)">
              {t.organization.signupDescription}
            </p>
            <div className="space-y-3">
              {signupModeOptions
                .map((value) => ({
                  value,
                  ...t.organization.signupModes[value],
                }))
                .map((option) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-2xl bg-(--surface) px-4 py-3.5 ring-2 ring-transparent transition has-[:checked]:bg-(--accent-softer) has-[:checked]:ring-(--accent)"
                    key={option.value}
                  >
                    <input
                      checked={values.signupMode === option.value}
                      className="mt-1 size-4 accent-(--accent)"
                      disabled={isSaving}
                      name="signup-mode"
                      onChange={() => handleSignupModeChange(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-bold text-(--fg)">
                        {option.label}
                      </span>
                      <span className="block text-sm leading-6 text-(--secondary)">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
            {values.signupMode === "domains" || errors.allowedEmailDomains ? (
              <div className="max-w-xl">
                <FieldShell
                  disabled={isSaving}
                  error={errors.allowedEmailDomains}
                  helper={t.organization.domainsHelper}
                  label={t.organization.domainsLabel}
                  name="allowed-email-domains"
                  onChange={handleChange("allowedEmailDomains")}
                  placeholder={t.organization.domainsPlaceholder}
                  readOnly={false}
                  value={values.allowedEmailDomains}
                />
              </div>
            ) : null}
          </fieldset>

          <div className="space-y-5 border-t border-(--border) pt-8">
            <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
              {t.organization.addressesHeading}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell
                disabled={isSaving || values.senderAddressFromEnv}
                error={errors.senderAddress}
                helper={
                  values.senderAddressFromEnv
                    ? t.organization.senderFromEnv
                    : t.organization.senderHelper
                }
                label={t.organization.senderLabel}
                name="sender-address"
                onChange={handleChange("senderAddress")}
                placeholder={t.organization.senderPlaceholder}
                readOnly={values.senderAddressFromEnv}
                type="email"
                value={values.senderAddress}
              />
              <FieldShell
                disabled={isSaving || values.supportAddressFromEnv}
                error={errors.supportAddress}
                helper={
                  values.supportAddressFromEnv
                    ? t.organization.supportFromEnv
                    : t.organization.supportHelper
                }
                label={t.organization.supportLabel}
                name="support-address"
                onChange={handleChange("supportAddress")}
                placeholder={t.organization.supportPlaceholder}
                readOnly={values.supportAddressFromEnv}
                type="email"
                value={values.supportAddress}
              />
            </div>
          </div>

          {!values.hosted ? (
            <div className="space-y-5 border-t border-(--border) pt-8">
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
                  {t.organization.legalHeading}
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
                  {t.organization.legalDescription}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell
                  disabled={isSaving}
                  error={errors.termsUrl}
                  label={t.organization.termsLabel}
                  name="terms-url"
                  onChange={handleChange("termsUrl")}
                  placeholder={t.organization.termsPlaceholder}
                  readOnly={false}
                  value={values.termsUrl}
                />
                <FieldShell
                  disabled={isSaving}
                  error={errors.privacyUrl}
                  label={t.organization.privacyLabel}
                  name="privacy-url"
                  onChange={handleChange("privacyUrl")}
                  placeholder={t.organization.privacyPlaceholder}
                  readOnly={false}
                  value={values.privacyUrl}
                />
              </div>
              <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
                {t.organization.privacyNoticeBefore}{" "}
                <a
                  className="font-semibold text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4"
                  href="/signer-privacy"
                  target="_blank"
                >
                  {t.organization.privacyNoticeLink}
                </a>
                {t.organization.privacyNoticeAfter}
              </p>
            </div>
          ) : null}

          <div className="space-y-5 border-t border-(--border) pt-8">
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
                {t.organization.retentionHeading}
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-(--secondary)">
                {t.organization.retentionDescription}
              </p>
            </div>
            <div className="max-w-xs">
              <FieldShell
                disabled={isSaving || values.part11Mode}
                error={errors.retentionDays}
                helper={
                  values.part11Mode ? t.organization.retentionPart11 : undefined
                }
                label={t.organization.retentionLabel}
                name="retention-days"
                onChange={handleChange("retentionDays")}
                placeholder={t.organization.retentionPlaceholder}
                readOnly={false}
                value={values.retentionDays}
              />
            </div>
          </div>

          <ShellButton className="w-fit" loading={isSaving} type="submit">
            {isSaving ? t.common.saving : t.organization.submit}
          </ShellButton>
        </form>

        <EmailSetupPanel key={emailRevision} />

        {/* The hosted service's accounts are strangers to each other, not
            one organization, so it has no list of them here. */}
        {!values.hosted ? <PeoplePanel part11Mode={values.part11Mode} /> : null}

        {!values.hosted ? (
          <SecurityPanel
            initialRequireTwoFactor={values.requireTwoFactor}
            initialSessionIdleMinutes={values.sessionIdleMinutes}
            initialSessionMaxHours={values.sessionMaxHours}
          />
        ) : null}

        {!values.hosted ? (
          <Part11Panel initialEnabled={values.part11Mode} />
        ) : null}

        <SignerDataPanel />
      </div>
    </section>
  );
}

async function fetchEmailStatus(
  signal: AbortSignal,
  GENERIC_ERROR_MESSAGE: string,
): Promise<{ error: string; status: null } | { status: EmailStatus }> {
  const response = await fetch("/api/admin/email", { signal });
  const payload = (await response.json().catch(() => null)) as EmailResponse;

  if (!response.ok || !payload?.status) {
    return { error: payload?.error ?? GENERIC_ERROR_MESSAGE, status: null };
  }

  return { status: payload.status };
}

function EmailSetupPanel() {
  const t = useSettingsMessages();
  const GENERIC_ERROR_MESSAGE = t.common.genericError;
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<EmailAction | null>(null);
  const [testResult, setTestResult] = useState<Feedback>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmailStatus(controller.signal, GENERIC_ERROR_MESSAGE)
      .then((result) => {
        if (result.status) {
          setLoadError(null);
          setStatus(result.status);
        } else {
          setLoadError(result.error);
        }
      })
      .catch((error: unknown) => {
        // Leaving the page cancels the request; that is not a failure.
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadError(GENERIC_ERROR_MESSAGE);
        }
      });

    return () => controller.abort();
  }, [GENERIC_ERROR_MESSAGE]);

  async function runAction(action: EmailAction) {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/email", {
        body: JSON.stringify({ action }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as EmailResponse;

      if (payload?.status) {
        setLoadError(null);
        setStatus(payload.status);
      }

      if (payload?.test) {
        setTestResult(
          payload.test.sent
            ? {
                message: t.email.testSent(payload.test.to),
                tone: "success",
              }
            : { message: payload.test.message, tone: "error" },
        );
      } else if (!response.ok) {
        setLoadError(payload?.error ?? GENERIC_ERROR_MESSAGE);
      }
    } catch {
      setLoadError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingAction(null);
    }
  }

  const summary = status ? describeEmailStatus(status, t) : null;
  const canSendTest =
    status !== null &&
    status.state !== "missing_key" &&
    status.state !== "capture";

  return (
    <div className="space-y-5 border-t border-(--border) pt-8" id="email-setup">
      <h3 className="text-lg font-extrabold tracking-[-0.02em] text-(--fg)">
        {t.email.heading}
      </h3>

      {loadError ? (
        <p className="notice notice-danger" role="alert">
          {loadError}
        </p>
      ) : null}

      {!summary ? (
        loadError ? null : (
          <p className="text-sm text-(--secondary)">{t.email.checking}</p>
        )
      ) : (
        <div
          className={`space-y-2 rounded-2xl px-5 py-4 ${
            summary.ready ? "bg-(--success-soft)" : "bg-(--surface)"
          }`}
          data-email-state={status?.state}
        >
          <p className="text-sm font-bold text-(--fg)">{summary.title}</p>
          {summary.lines.map((line) => (
            <p className="text-sm leading-6 text-(--secondary)" key={line}>
              {line}
            </p>
          ))}
          {summary.steps ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-(--secondary) marker:font-semibold marker:text-(--fg)">
              {summary.steps.map((step) => (
                <li key={step.text}>
                  {step.text}
                  {step.link ? (
                    <>
                      {" "}
                      <a
                        className="font-semibold text-(--accent-ink) underline underline-offset-4"
                        href={step.link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {step.link.label}
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}

      {status?.state === "domain_pending" ? (
        <DnsRecordsTable domain={status.domain} records={status.records} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {status?.state === "domain_missing" ? (
          <ShellButton
            disabled={pendingAction !== null}
            loading={pendingAction === "add_domain"}
            onClick={() => void runAction("add_domain")}
          >
            {pendingAction === "add_domain"
              ? t.email.adding
              : t.email.setUpDomain(status.domain)}
          </ShellButton>
        ) : null}
        {status?.state === "domain_pending" ? (
          <ShellButton
            disabled={pendingAction !== null}
            loading={pendingAction === "recheck"}
            onClick={() => void runAction("recheck")}
          >
            {pendingAction === "recheck" ? t.common.checking : t.email.checkDns}
          </ShellButton>
        ) : null}
        {canSendTest ? (
          <ShellButton
            disabled={pendingAction !== null}
            loading={pendingAction === "send_test"}
            onClick={() => void runAction("send_test")}
            variant="secondary"
          >
            {pendingAction === "send_test"
              ? t.common.sending
              : t.email.sendTest}
          </ShellButton>
        ) : null}
        {status?.state === "restricted_key" ||
        status?.state === "error" ||
        status?.state === "test_sender" ? (
          <ShellButton href={RESEND_DOMAINS_URL} variant="ghost">
            {t.email.openResend}
          </ShellButton>
        ) : null}
      </div>

      {testResult ? (
        <p
          className={`notice ${
            testResult.tone === "success" ? "notice-success" : "notice-danger"
          }`}
          role={testResult.tone === "error" ? "alert" : "status"}
        >
          {testResult.message}
        </p>
      ) : null}
    </div>
  );
}

type EmailStep = {
  link?: { href: string; label: string };
  text: string;
};

function describeEmailStatus(
  status: EmailStatus,
  t: SettingsMessages,
): {
  lines: string[];
  ready: boolean;
  steps?: EmailStep[];
  title: string;
} {
  const m = t.email.status;

  switch (status.state) {
    case "capture":
      return {
        lines: [m.captureLine],
        ready: true,
        title: m.captureTitle,
      };
    case "missing_key":
      return status.onVercel
        ? {
            lines: [t.email.noKeyLine],
            ready: false,
            steps: [
              {
                link: {
                  href: RESEND_MARKETPLACE_URL,
                  label: m.vercelMarketplaceLink,
                },
                text: m.vercelStepInstall,
              },
              { text: m.vercelStepCheckVariable },
              { text: m.vercelStepRedeploy },
              { text: m.vercelStepReload },
            ],
            title: t.email.notConnectedTitle,
          }
        : {
            lines: [t.email.noKeyLine],
            ready: false,
            steps: [
              {
                link: {
                  href: "https://resend.com/api-keys",
                  label: m.apiKeysLink,
                },
                text: m.selfStepCreateKey,
              },
              { text: m.selfStepSetVariable },
              { text: m.selfStepRestart },
            ],
            title: t.email.notConnectedTitle,
          };
    case "test_sender":
      return {
        lines: [m.testSenderLine(status.senderAddress), m.testSenderHint],
        ready: false,
        title: m.testSenderTitle,
      };
    case "domain_missing":
      return {
        lines: [m.domainMissingLine(status.domain)],
        ready: false,
        title: m.domainMissingTitle(status.domain),
      };
    case "domain_pending":
      return {
        lines: [
          m.domainPendingLine(status.domain),
          ...(status.mayAlreadySend ? [m.domainPendingMaySend] : []),
        ],
        ready: false,
        title: m.domainPendingTitle(status.domain),
      };
    case "restricted_key":
      return {
        lines: [m.restrictedKeyLine(status.domain), m.restrictedKeyHint],
        ready: false,
        title: m.restrictedKeyTitle,
      };
    case "ready":
      return {
        lines: [m.readyLine(status.senderAddress, status.domain)],
        ready: true,
        title: m.readyTitle,
      };
    case "error":
      return {
        lines: [m.errorLine(status.message)],
        ready: false,
        title: m.errorTitle,
      };
  }
}

function DnsRecordsTable({
  domain,
  records,
}: {
  domain: string;
  records: readonly EmailDnsRecord[];
}) {
  const t = useSettingsMessages();

  if (records.length === 0) {
    return (
      <p className="text-sm leading-6 text-(--secondary)">
        {t.email.dns.noRecords(domain)}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-(--border)">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{t.email.dns.caption(domain)}</caption>
        <thead>
          <tr className="border-b border-(--border) bg-(--surface) text-xs text-(--tertiary)">
            <th className="px-4 py-3 font-semibold" scope="col">
              {t.email.dns.type}
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              {t.email.dns.name}
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              {t.email.dns.value}
            </th>
            <th className="px-4 py-3 font-semibold" scope="col">
              {t.email.dns.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              className="border-b border-(--border) align-top last:border-b-0"
              key={`${record.type}-${record.name}-${record.value}`}
            >
              <td className="px-4 py-3 font-semibold text-(--fg)">
                {record.type}
                {record.priority !== null ? (
                  <span className="block text-xs font-normal text-(--tertiary)">
                    {t.email.dns.priority(record.priority)}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-[0.8rem] break-all text-(--fg)">
                {record.name}
              </td>
              <td className="px-4 py-3 font-mono text-[0.8rem] break-all text-(--fg)">
                {record.value}
              </td>
              <td className="px-4 py-3 text-(--secondary)">
                {record.status === "verified"
                  ? t.email.dns.found
                  : t.email.dns.notFound}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
