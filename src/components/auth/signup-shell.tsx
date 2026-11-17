"use client";

import Link from "next/link";
import {
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type FormEvent,
} from "react";

import { SsoButton, type SsoOption } from "@/components/auth/sso-button";
import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { authClient } from "@/lib/auth/client";
import { useAppMessages } from "@/lib/i18n/use-app-messages";
import { useLocale } from "@/lib/i18n/use-locale";
import {
  describePasswordRefusal,
  newPasswordLengthError,
  passwordTooShortMessage,
} from "@/lib/password-messages";
import { signUpSchema } from "@/lib/schemas/auth";

type AuthErrorLike = {
  code?: string;
  message?: string;
};

// Codes the server answers with when this install's sign-up rule turns an
// address away. The message that comes with them says what the rule is.
const SIGNUP_RULE_ERROR_CODES = new Set([
  "setup_required",
  "signup_closed",
  "signup_domain_not_allowed",
]);

type SignupShellProps = {
  /** False when password sign-in is turned off, so accounts come from SSO. */
  passwordSignIn?: boolean;
  /** Single sign-on, when the install has it (lib/auth/sso.ts). */
  sso?: SsoOption | null;
  /** False when this install is not taking new accounts at all. */
  signupAvailable?: boolean;
  /** One sentence on who can create an account, or null when anyone can. */
  signupRule?: string | null;
};

type SignupFormValues = {
  email: string;
  fullName: string;
  password: string;
};

type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>;

function createSignupFormValues(): SignupFormValues {
  return {
    email: "",
    fullName: "",
    password: "",
  };
}

function trimFormValues(values: SignupFormValues): SignupFormValues {
  return {
    email: values.email.trim(),
    fullName: values.fullName.trim(),
    password: values.password,
  };
}

function normalizeAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  return error?.message?.trim().toLowerCase() ?? "";
}

type SignupFormCardProps = {
  bannerMessage: string | null;
  errors: SignupFormErrors;
  formLocked: boolean;
  isResendingVerification?: boolean;
  isSubmitting: boolean;
  onEmailChange: ChangeEventHandler<HTMLInputElement>;
  onFullNameChange: ChangeEventHandler<HTMLInputElement>;
  onPasswordChange: ChangeEventHandler<HTMLInputElement>;
  onResendVerification?: () => void | Promise<void>;
  onSsoError: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  passwordSignIn: boolean;
  showSuccess: boolean;
  signupRule: string | null;
  sso: SsoOption | null;
  successMessage: string | null;
  values: SignupFormValues;
};

function SignupFormCard({
  bannerMessage,
  errors,
  formLocked,
  isResendingVerification = false,
  isSubmitting,
  onEmailChange,
  onFullNameChange,
  onPasswordChange,
  onResendVerification,
  onSsoError,
  onSubmit,
  passwordSignIn,
  showSuccess,
  signupRule,
  sso,
  successMessage,
  values,
}: SignupFormCardProps) {
  const m = useAppMessages();

  return (
    <section className="panel w-full max-w-[460px] p-8 sm:p-10">
      <div className="space-y-7">
        <div className="space-y-2">
          <p className="section-eyebrow">{m.signup.eyebrow}</p>
          <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
            {m.signup.title}
          </h1>
          {signupRule ? (
            <p className="pt-1 text-sm leading-6 text-muted-foreground">
              {signupRule}
            </p>
          ) : null}
        </div>

        {bannerMessage ? (
          <p className="notice notice-danger" role="alert">
            {bannerMessage}
          </p>
        ) : null}

        {showSuccess ? (
          <div aria-live="polite" className="notice notice-success">
            <p>{successMessage ?? m.signup.successDefault}</p>
          </div>
        ) : null}

        {sso ? (
          <SsoButton
            onError={onSsoError}
            sso={sso}
            variant={passwordSignIn ? "secondary" : "primary"}
          />
        ) : null}

        {sso && passwordSignIn ? (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-(--secondary)">
            {m.common.or}
          </p>
        ) : null}

        {passwordSignIn ? (
          <form className="space-y-5" noValidate onSubmit={onSubmit}>
            <FieldShell
              autoComplete="name"
              disabled={formLocked}
              error={errors.fullName}
              label={m.signup.fullName}
              name="signup-full-name"
              onChange={onFullNameChange}
              placeholder={m.signup.fullNamePlaceholder}
              readOnly={formLocked}
              value={values.fullName}
            />
            <FieldShell
              autoComplete="email"
              disabled={formLocked}
              error={errors.email}
              label={m.common.email}
              name="signup-email"
              onChange={onEmailChange}
              placeholder={m.common.emailPlaceholder}
              readOnly={formLocked}
              type="email"
              value={values.email}
            />
            <FieldShell
              autoComplete="new-password"
              disabled={formLocked}
              error={errors.password}
              helper={m.common.passwordMinLengthHelper}
              label={m.common.password}
              name="signup-password"
              onChange={onPasswordChange}
              placeholder={m.common.passwordPlaceholder}
              readOnly={formLocked}
              type="password"
              value={values.password}
            />

            {showSuccess ? (
              <div className="flex flex-col gap-3">
                <ShellButton className="w-full" href="/login" variant="primary">
                  {m.common.goToLogIn}
                </ShellButton>
                {onResendVerification ? (
                  <ShellButton
                    className="w-full"
                    disabled={formLocked}
                    loading={isResendingVerification}
                    onClick={onResendVerification}
                    type="button"
                    variant="secondary"
                  >
                    {isResendingVerification
                      ? m.common.sending
                      : m.common.resendVerification}
                  </ShellButton>
                ) : null}
              </div>
            ) : (
              <ShellButton
                className="w-full"
                disabled={formLocked}
                loading={isSubmitting}
                type="submit"
                variant="primary"
              >
                {isSubmitting ? m.signup.submitting : m.common.signUp}
              </ShellButton>
            )}
          </form>
        ) : null}

        <div className="border-t border-(--border) pt-5 text-sm text-(--secondary)">
          {m.signup.alreadyHaveAccount}{" "}
          <Link
            className="font-bold text-(--accent-ink) underline-offset-4 hover:underline"
            href="/login"
          >
            {m.common.logIn}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SignupShell({
  passwordSignIn = true,
  signupAvailable = true,
  signupRule = null,
  sso = null,
}: SignupShellProps) {
  if (!signupAvailable) {
    return <SignupClosedCard />;
  }

  return (
    <LiveSignupShell
      passwordSignIn={passwordSignIn || !sso}
      signupRule={signupRule}
      sso={sso}
    />
  );
}

function SignupClosedCard() {
  const m = useAppMessages();

  return (
    <section className="panel w-full max-w-[460px] p-8 sm:p-10">
      <div className="space-y-7">
        <div className="space-y-2">
          <p className="section-eyebrow">{m.signup.eyebrow}</p>
          <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
            {m.signup.closedTitle}
          </h1>
          <p className="pt-1 text-sm leading-6 text-muted-foreground">
            {m.signup.closedDescription}
          </p>
        </div>
        <ShellButton className="w-full" href="/login" variant="primary">
          {m.common.goToLogIn}
        </ShellButton>
      </div>
    </section>
  );
}

function LiveSignupShell({
  passwordSignIn,
  signupRule,
  sso,
}: {
  passwordSignIn: boolean;
  signupRule: string | null;
  sso: SsoOption | null;
}) {
  const m = useAppMessages();
  const locale = useLocale();
  const [values, setValues] = useState<SignupFormValues>(
    createSignupFormValues(),
  );
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleChange(field: keyof SignupFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));

      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
      setBannerMessage(null);
      setShowSuccess(false);
      setSuccessMessage(null);
    };
  }

  async function handleResendVerification() {
    if (!successEmail || isResendingVerification) {
      return;
    }

    setBannerMessage(null);
    setIsResendingVerification(true);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        body: JSON.stringify({
          callbackURL: `${window.location.origin}/dashboard`,
          email: successEmail,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setBannerMessage(m.common.resendVerificationFailed);
        return;
      }

      setSuccessMessage(m.common.verificationSent);
    } catch {
      setBannerMessage(m.common.resendVerificationFailed);
    } finally {
      setIsResendingVerification(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isResendingVerification) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedValues = trimFormValues({
      email: String(formData.get("signup-email") ?? values.email),
      fullName: String(formData.get("signup-full-name") ?? values.fullName),
      password: String(formData.get("signup-password") ?? values.password),
    });
    const validationResult = signUpSchema.safeParse(trimmedValues);

    if (!validationResult.success) {
      const nextErrors: SignupFormErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === "email") {
          nextErrors.email = m.common.enterValidEmail;
        }

        if (field === "fullName") {
          nextErrors.fullName = m.signup.enterFullName;
        }

        if (field === "password") {
          nextErrors.password =
            newPasswordLengthError(trimmedValues.password, locale) ??
            passwordTooShortMessage(locale);
        }
      }

      setValues(trimmedValues);
      setErrors(nextErrors);
      setBannerMessage(null);
      setShowSuccess(false);
      setSuccessMessage(null);
      return;
    }

    setValues(validationResult.data);
    setErrors({});
    setBannerMessage(null);
    setShowSuccess(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({
      callbackURL: `${window.location.origin}/dashboard`,
      email: validationResult.data.email,
      name: validationResult.data.fullName,
      password: validationResult.data.password,
    });

    if (result.error) {
      const normalizedErrorMessage = normalizeAuthErrorMessage(result.error);

      if (SIGNUP_RULE_ERROR_CODES.has(result.error.code ?? "")) {
        setBannerMessage(result.error.message ?? m.signup.notAccepted);
      } else if (
        normalizedErrorMessage.includes("user already exists") ||
        normalizedErrorMessage.includes("use another email")
      ) {
        setErrors({
          email: m.signup.alreadyRegistered,
        });
      } else if (describePasswordRefusal(result.error)) {
        setErrors({
          password: describePasswordRefusal(result.error, locale)!,
        });
      } else {
        setBannerMessage(m.common.somethingWentWrong);
      }

      setIsSubmitting(false);
      return;
    }

    setSuccessEmail(validationResult.data.email);
    setSuccessMessage(m.signup.successDefault);
    setShowSuccess(true);
    setIsSubmitting(false);
  }

  return (
    <SignupFormCard
      bannerMessage={bannerMessage}
      errors={errors}
      formLocked={isSubmitting || isResendingVerification}
      isResendingVerification={isResendingVerification}
      isSubmitting={isSubmitting}
      onEmailChange={handleChange("email")}
      onFullNameChange={handleChange("fullName")}
      onPasswordChange={handleChange("password")}
      onResendVerification={handleResendVerification}
      onSsoError={setBannerMessage}
      onSubmit={handleSubmit}
      passwordSignIn={passwordSignIn}
      showSuccess={showSuccess}
      signupRule={signupRule}
      sso={sso}
      successMessage={successMessage}
      values={values}
    />
  );
}
