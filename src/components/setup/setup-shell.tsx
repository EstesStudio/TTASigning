"use client";

import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { Brand } from "@/components/layout/brand";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import type { AppMessages } from "@/lib/i18n/app-messages";
import { useAppMessages } from "@/lib/i18n/use-app-messages";
import {
  buildSenderAddress,
  DEFAULT_SENDER_LOCAL_PART,
  DEFAULT_SENDING_SUBDOMAIN,
  joinSendingDomain,
  normalizeSubdomain,
  readResendEmailDomain,
  suggestSendingRootDomain,
  type SenderAddressParts,
} from "@/lib/sending-domain";
import type { SetupFieldName, SetupView } from "@/lib/setup";
import { getEmailDomain, suggestSignupPolicy } from "@/lib/signup-policy";

export type SetupShellView =
  | Exclude<SetupView, { view: "complete" }>
  | { view: "complete" }
  | { view: "no_database" };

type SetupShellProps = {
  hosted: boolean;
  onVercel: boolean;
  /**
   * A support address setup does not ask for, because SUPPORT_EMAIL sets it
   * or one is saved already. Its domain helps guess the sending domain.
   */
  knownSupportAddress: string | null;
  /** RESEND_EMAIL_DOMAIN, set by the Resend integration on Vercel. */
  resendDomain: string | null;
  /** The host this site answers on, used to guess the sending domain. */
  siteHost: string | null;
  view: SetupShellView;
};

type SetupValues = Record<SetupFieldName, string>;
type SetupErrors = Partial<Record<SetupFieldName, string>>;

type SetupResponse = {
  error?: string;
  fieldErrors?: SetupErrors;
  redirectTo?: string;
} | null;

const emptyValues: SetupValues = {
  email: "",
  fullName: "",
  organizationName: "",
  password: "",
  senderAddress: "",
  setupToken: "",
  supportAddress: "",
};

export function SetupShell({
  hosted,
  knownSupportAddress,
  onVercel,
  resendDomain,
  siteHost,
  view,
}: SetupShellProps) {
  const m = useAppMessages();

  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <div className="page-width flex items-center justify-between gap-4 py-4">
          <Brand href="/setup" />
          <span className="pill pill-accent">{m.setup.pill}</span>
        </div>
      </header>

      <main className="page-width flex flex-1 items-start justify-center py-8 sm:py-14">
        <div className="flex w-full justify-center" data-animate="enter">
          <section className="panel w-full max-w-[520px] p-8 sm:p-10">
            <SetupContent
              hosted={hosted}
              knownSupportAddress={knownSupportAddress}
              onVercel={onVercel}
              resendDomain={resendDomain}
              siteHost={siteHost}
              view={view}
            />
          </section>
        </div>
      </main>

      <PublicLegalFooter />
    </div>
  );
}

function SetupContent({
  hosted,
  knownSupportAddress,
  onVercel,
  resendDomain,
  siteHost,
  view,
}: SetupShellProps) {
  const m = useAppMessages();

  if (view.view === "no_database") {
    return (
      <SetupNotice title={m.setup.noDatabaseTitle}>
        <p>{m.setup.noDatabaseBody}</p>
        {onVercel ? (
          <p>{m.setup.noDatabaseVercel}</p>
        ) : (
          <p>
            {m.setup.noDatabaseSelfBefore}
            <code>npm run db:migrate</code>
            {m.setup.noDatabaseSelfAfter}
          </p>
        )}
      </SetupNotice>
    );
  }

  if (view.view === "unmigrated") {
    return (
      <SetupNotice title={m.setup.unmigratedTitle}>
        <p>{m.setup.unmigratedBody}</p>
        {onVercel ? (
          <p>{m.setup.unmigratedVercel}</p>
        ) : (
          <p>
            {m.setup.unmigratedSelfBefore}
            <code>npm run db:migrate</code>
            {m.setup.unmigratedSelfAfter}
          </p>
        )}
      </SetupNotice>
    );
  }

  if (view.view === "claim") {
    if (!view.tokenConfigured) {
      return (
        <SetupNotice title={m.setup.claimTitle}>
          <p>{m.setup.claimTokenBody}</p>
          <p>{m.setup.claimTokenWhy}</p>
        </SetupNotice>
      );
    }

    if (!view.signedInEmail) {
      return (
        <SetupNotice title={m.setup.claimTitle}>
          <p>{m.setup.claimSignInBody}</p>
          <ShellButton className="w-full" href="/login" variant="primary">
            {m.common.goToLogIn}
          </ShellButton>
        </SetupNotice>
      );
    }
  }

  if (view.view === "complete") {
    return null;
  }

  return (
    <SetupForm
      hosted={hosted}
      knownSupportAddress={knownSupportAddress}
      resendDomain={resendDomain}
      siteHost={siteHost}
      view={view}
    />
  );
}

function SetupNotice({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
          {title}
        </h1>
      </div>
      <div className="space-y-4 text-sm leading-6 text-muted-foreground [&_code]:rounded-md [&_code]:bg-(--surface) [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-(--fg)">
        {children}
      </div>
    </div>
  );
}

function describeSignupStart(
  email: string,
  hosted: boolean,
  m: AppMessages,
): string | null {
  if (hosted) {
    return null;
  }

  if (!getEmailDomain(email)) {
    return null;
  }

  const policy = suggestSignupPolicy(email);

  if (policy.signupMode === "domains") {
    return m.setup.signupStartDomains(policy.allowedEmailDomains[0] ?? "");
  }

  return m.setup.signupStartOnlyYou;
}

type SenderErrors = Partial<Record<keyof SenderAddressParts, string>>;

function SetupForm({
  hosted,
  knownSupportAddress,
  resendDomain,
  siteHost,
  view,
}: {
  hosted: boolean;
  knownSupportAddress: string | null;
  resendDomain: string | null;
  siteHost: string | null;
  view: Extract<SetupShellView, { view: "claim" | "create" }>;
}) {
  const m = useAppMessages();
  const [values, setValues] = useState<SetupValues>(emptyValues);
  // The domain the Resend integration set up comes first. Without one,
  // until the administrator types a domain of their own, it follows what
  // setup can tell from the site's address and the emails typed above.
  const [integrationSender] = useState(() =>
    readResendEmailDomain(resendDomain),
  );
  const [sender, setSender] = useState<SenderAddressParts>(
    () =>
      integrationSender ?? {
        localPart: DEFAULT_SENDER_LOCAL_PART,
        rootDomain: "",
        subdomain: DEFAULT_SENDING_SUBDOMAIN,
      },
  );
  const [rootDomainEdited, setRootDomainEdited] = useState(
    integrationSender !== null,
  );
  const [senderErrors, setSenderErrors] = useState<SenderErrors>({});
  const [errors, setErrors] = useState<SetupErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const router = useRouter();
  const isCreate = view.view === "create";
  const requiresToken = isCreate ? view.requiresToken : true;
  const asksForSender = isCreate && !view.senderAddressFromEnv;
  const asksForSupport = view.asksForSupportAddress;
  const suggestedRootDomain = asksForSender
    ? suggestSendingRootDomain({
        emails: [values.email, values.supportAddress, knownSupportAddress],
        siteHost,
      })
    : null;
  const senderParts: SenderAddressParts = {
    ...sender,
    rootDomain: rootDomainEdited
      ? sender.rootDomain
      : (suggestedRootDomain ?? ""),
  };

  function handleSenderChange(field: keyof SenderAddressParts) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      if (field === "rootDomain") {
        setRootDomainEdited(true);
      }

      setSender((current) => ({ ...current, [field]: nextValue }));
      setSenderErrors((current) => ({ ...current, [field]: undefined }));
      setErrors((current) => ({ ...current, senderAddress: undefined }));
      setBannerMessage(null);
    };
  }

  async function handleSwitchAccount() {
    if (isSwitchingAccount) {
      return;
    }

    setIsSwitchingAccount(true);

    // The login page sends anyone who is signed in on to the dashboard, so
    // the current session has to end before it will show its form.
    await authClient.signOut().catch(() => undefined);
    router.push("/login");
  }

  function handleChange(field: SetupFieldName) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({ ...currentValues, [field]: nextValue }));
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
      setBannerMessage(null);
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setBannerMessage(null);
    setErrors({});
    setSenderErrors({});

    const builtSender = asksForSender
      ? buildSenderAddress(senderParts)
      : { address: null, error: null };

    if (builtSender.error) {
      setSenderErrors({ [builtSender.error.field]: builtSender.error.message });
      setBannerMessage(m.setup.checkSender);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/setup", {
        body: JSON.stringify({
          organizationName: values.organizationName,
          setupToken: requiresToken ? values.setupToken : undefined,
          supportAddress: asksForSupport ? values.supportAddress : undefined,
          ...(isCreate
            ? {
                email: values.email,
                fullName: values.fullName,
                password: values.password,
                senderAddress: builtSender.address ?? undefined,
              }
            : {}),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as SetupResponse;

      if (!response.ok) {
        setErrors(payload?.fieldErrors ?? {});
        setBannerMessage(payload?.error ?? m.setup.genericError);
        setIsSubmitting(false);
        return;
      }

      // A full page load, so the app starts again with the new session and
      // the organization's name.
      window.location.assign(payload?.redirectTo ?? "/dashboard");
    } catch {
      setBannerMessage(m.setup.genericError);
      setIsSubmitting(false);
    }
  }

  const signupStart = isCreate
    ? describeSignupStart(values.email, hosted, m)
    : null;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
          {isCreate ? m.setup.createTitle : m.setup.claimTitle}
        </h1>
        <p className="pt-1 text-sm leading-6 text-muted-foreground">
          {isCreate
            ? m.setup.createIntro
            : m.setup.claimIntro(view.signedInEmail ?? "")}
        </p>
      </div>

      {bannerMessage ? (
        <p className="notice notice-danger" role="alert">
          {bannerMessage}
        </p>
      ) : null}

      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <FieldShell
          autoComplete="organization"
          disabled={isSubmitting}
          error={errors.organizationName}
          helper={m.setup.organizationNameHelper}
          label={m.setup.organizationName}
          name="setup-organization-name"
          onChange={handleChange("organizationName")}
          placeholder={m.setup.organizationNamePlaceholder}
          readOnly={false}
          value={values.organizationName}
        />

        {asksForSupport ? (
          <FieldShell
            autoComplete="off"
            disabled={isSubmitting}
            error={errors.supportAddress}
            helper={m.setup.supportEmailHelper}
            ignorePasswordManagers
            label={m.setup.supportEmail}
            name="setup-support-address"
            onChange={handleChange("supportAddress")}
            placeholder={m.setup.supportEmailPlaceholder}
            readOnly={false}
            type="email"
            value={values.supportAddress}
          />
        ) : null}

        {isCreate ? (
          <>
            <FieldShell
              autoComplete="name"
              disabled={isSubmitting}
              error={errors.fullName}
              label={m.setup.yourName}
              name="setup-full-name"
              onChange={handleChange("fullName")}
              placeholder={m.signup.fullNamePlaceholder}
              readOnly={false}
              value={values.fullName}
            />
            <FieldShell
              // "username" tells password managers this is the login the
              // new password belongs to, so they save the two together.
              autoComplete="username"
              disabled={isSubmitting}
              error={errors.email}
              helper={signupStart ?? undefined}
              label={m.setup.yourEmail}
              name="setup-email"
              onChange={handleChange("email")}
              placeholder={m.common.emailPlaceholder}
              readOnly={false}
              type="email"
              value={values.email}
            />
            <FieldShell
              autoComplete="new-password"
              disabled={isSubmitting}
              error={errors.password}
              helper={m.setup.passwordHelper}
              label={m.common.password}
              // No maxLength: the browser would cut a longer password short
              // without a word, and the account would get a password other
              // than the one typed. Setup refuses one over 128 instead.
              minLength={15}
              name="setup-password"
              passwordRules="minlength: 20; maxlength: 64; required: lower; required: upper; required: digit; allowed: [-_.!@#$%^&*];"
              onChange={handleChange("password")}
              placeholder={m.common.passwordPlaceholder}
              readOnly={false}
              type="password"
              value={values.password}
            />
          </>
        ) : null}

        {asksForSender ? (
          <SenderFields
            disabled={isSubmitting}
            errors={senderErrors}
            onChange={handleSenderChange}
            parts={senderParts}
            serverError={errors.senderAddress}
            source={
              integrationSender &&
              sender.rootDomain === integrationSender.rootDomain
                ? "integration"
                : !rootDomainEdited && suggestedRootDomain !== null
                  ? "guess"
                  : null
            }
          />
        ) : null}

        {requiresToken ? (
          <FieldShell
            autoComplete="off"
            disabled={isSubmitting}
            error={errors.setupToken}
            helper={m.setup.setupTokenHelper}
            // Not a password of the account being made, so a password
            // manager should neither fill nor save it.
            ignorePasswordManagers
            label={m.setup.setupToken}
            name="setup-token"
            onChange={handleChange("setupToken")}
            readOnly={false}
            type="password"
            value={values.setupToken}
          />
        ) : null}

        <ShellButton
          className="w-full"
          disabled={isSubmitting}
          loading={isSubmitting}
          type="submit"
          variant="primary"
        >
          {isSubmitting
            ? m.setup.submitting
            : isCreate
              ? m.setup.finish
              : m.setup.become}
        </ShellButton>
      </form>

      {!isCreate ? (
        <p className="border-t border-(--border) pt-5 text-sm text-(--secondary)">
          {m.setup.notRightAccount}{" "}
          <button
            className="cursor-pointer font-bold text-(--accent-ink) underline-offset-4 hover:underline disabled:cursor-default disabled:opacity-60"
            disabled={isSwitchingAccount}
            onClick={handleSwitchAccount}
            type="button"
          >
            {m.setup.logInAsSomeoneElse}
          </button>
        </p>
      ) : null}
    </div>
  );
}

const senderLabelClass = "text-[0.8125rem] font-semibold text-(--secondary)";
const senderHelperClass = "text-xs leading-5 text-(--tertiary)";
const senderErrorClass = "text-xs font-semibold text-(--danger)";

// The address this site sends from, asked for as its parts: the
// organization's domain (filled in when setup can tell it), a subdomain in
// front of it ("sign" unless changed) and the name before the @. Together
// they read as notifications@sign.acmecorp.com.
function SenderFields({
  disabled,
  errors,
  onChange,
  parts,
  serverError,
  source,
}: {
  disabled: boolean;
  errors: SenderErrors;
  onChange: (
    field: keyof SenderAddressParts,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  parts: SenderAddressParts;
  serverError?: string;
  /** Where the domain shown came from, if setup filled it in. */
  source: "guess" | "integration" | null;
}) {
  const m = useAppMessages();
  const built = buildSenderAddress(parts);
  const rootDomain = parts.rootDomain.trim().toLowerCase();
  // The same tidying the saved address gets, so the preview matches it.
  const subdomain = normalizeSubdomain(parts.subdomain) ?? "";
  const sendingDomain = rootDomain
    ? joinSendingDomain(rootDomain, subdomain)
    : null;
  const rootError = errors.rootDomain ?? serverError;
  const passwordManagerIgnore = {
    "data-1p-ignore": "true",
    "data-lpignore": "true",
  };

  return (
    <fieldset className="space-y-4 rounded-2xl border border-(--border) p-4 sm:p-5">
      <legend className="px-1 text-sm font-bold text-(--fg)">
        {m.setup.senderLegend}
      </legend>
      <p className={senderHelperClass}>{m.setup.senderIntro}</p>

      <div className="space-y-2 text-sm">
        <label className={senderLabelClass} htmlFor="setup-sender-domain">
          {m.setup.senderDomain}
        </label>
        <Input
          aria-describedby="setup-sender-domain-description"
          aria-invalid={rootError ? true : undefined}
          autoComplete="off"
          className={rootError ? "border-(--danger)" : undefined}
          disabled={disabled}
          id="setup-sender-domain"
          inputMode="url"
          name="setup-sender-domain"
          onChange={onChange("rootDomain")}
          placeholder="acmecorp.com"
          spellCheck={false}
          value={parts.rootDomain}
          {...passwordManagerIgnore}
        />
        <p
          className={rootError ? senderErrorClass : senderHelperClass}
          id="setup-sender-domain-description"
        >
          {rootError ??
            (source === "integration"
              ? m.setup.senderDomainIntegration
              : source === "guess"
                ? m.setup.senderDomainGuess
                : m.setup.senderDomainDefault)}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <label className={senderLabelClass} htmlFor="setup-sender-subdomain">
          {m.setup.senderSubdomain}
        </label>
        <div className="flex items-center gap-2">
          <Input
            aria-describedby="setup-sender-subdomain-description"
            aria-invalid={errors.subdomain ? true : undefined}
            autoComplete="off"
            className={cn(
              "w-40 flex-none",
              errors.subdomain ? "border-(--danger)" : "",
            )}
            disabled={disabled}
            id="setup-sender-subdomain"
            name="setup-sender-subdomain"
            onChange={onChange("subdomain")}
            placeholder={m.setup.senderSubdomainPlaceholder}
            spellCheck={false}
            value={parts.subdomain}
            {...passwordManagerIgnore}
          />
          <span className="min-w-0 truncate text-sm text-(--secondary)">
            .{rootDomain || "acmecorp.com"}
          </span>
        </div>
        <p
          className={errors.subdomain ? senderErrorClass : senderHelperClass}
          id="setup-sender-subdomain-description"
        >
          {errors.subdomain ??
            (subdomain
              ? m.setup.senderSubdomainRecommended(
                  sendingDomain ?? `${subdomain}.acmecorp.com`,
                  rootDomain || m.setup.theDomain,
                )
              : m.setup.senderSubdomainNone(
                  rootDomain || m.setup.theDomain,
                  DEFAULT_SENDING_SUBDOMAIN,
                ))}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <label className={senderLabelClass} htmlFor="setup-sender-local-part">
          {m.setup.senderAddress}
        </label>
        <div className="flex items-center gap-2">
          <Input
            aria-describedby="setup-sender-local-part-description"
            aria-invalid={errors.localPart ? true : undefined}
            autoComplete="off"
            className={cn(
              "w-40 flex-none",
              errors.localPart ? "border-(--danger)" : "",
            )}
            disabled={disabled}
            id="setup-sender-local-part"
            name="setup-sender-local-part"
            onChange={onChange("localPart")}
            spellCheck={false}
            value={parts.localPart}
            {...passwordManagerIgnore}
          />
          <span className="min-w-0 truncate text-sm text-(--secondary)">
            @{sendingDomain ?? "acmecorp.com"}
          </span>
        </div>
        <p
          className={errors.localPart ? senderErrorClass : senderHelperClass}
          id="setup-sender-local-part-description"
        >
          {errors.localPart ?? m.setup.senderAddressHelper}
        </p>
      </div>

      {built.address ? (
        <p className="rounded-xl bg-(--surface) px-4 py-3 text-xs leading-5 text-(--secondary)">
          {m.setup.senderPreviewBefore}{" "}
          <strong className="font-semibold text-(--fg)">{built.address}</strong>
          {m.setup.senderPreviewAfter(built.sendingDomain)}
        </p>
      ) : null}
    </fieldset>
  );
}
