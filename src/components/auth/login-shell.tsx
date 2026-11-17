"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { useBranding } from "@/components/layout/branding-provider";
import {
  describeSsoError,
  SsoButton,
  type SsoOption,
} from "@/components/auth/sso-button";
import { FieldShell, ShellButton } from "@/components/shared/form-shell";
import { authClient } from "@/lib/auth/client";
import { useAppMessages } from "@/lib/i18n/use-app-messages";
import { useLocale } from "@/lib/i18n/use-locale";
import {
  describePasswordRefusal,
  isPasswordTooLongMessage,
  newPasswordLengthError,
} from "@/lib/password-messages";
import { forgotPasswordSchema, loginSchema } from "@/lib/schemas/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthErrorLike = {
  code?: string;
  message?: string;
};

type LoginFormValues = {
  email: string;
  password: string;
};

type ForgotPasswordFormValues = {
  email: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
type ForgotPasswordFormErrors = Partial<
  Record<keyof ForgotPasswordFormValues, string>
>;

type LoginShellProps = {
  /** "on", "off", or "fallback": off, but a few addresses may still use one. */
  passwordSignIn?: "fallback" | "off" | "on";
  resetError?: string | null;
  resetToken?: string | null;
  sso?: SsoOption | null;
  /** The ?error= single sign-on came back with. */
  ssoError?: string | null;
};

type ForgotPasswordModel = {
  bannerMessage: string | null;
  errors: ForgotPasswordFormErrors;
  isOpen: boolean;
  isSubmitting: boolean;
  successMessage: string | null;
  values: ForgotPasswordFormValues;
};

function createLoginFormValues(): LoginFormValues {
  return {
    email: "",
    password: "",
  };
}

function createForgotPasswordValues(
  email: string,
  trim = false,
): ForgotPasswordFormValues {
  return {
    email: trim ? email.trim() : email,
  };
}

function createForgotPasswordModel(
  email: string,
  overrides: Partial<Omit<ForgotPasswordModel, "values">> = {},
): ForgotPasswordModel {
  return {
    bannerMessage: null,
    errors: {},
    isOpen: false,
    isSubmitting: false,
    successMessage: null,
    values: createForgotPasswordValues(email),
    ...overrides,
  };
}

function trimLoginValues(values: LoginFormValues): LoginFormValues {
  return {
    email: values.email.trim(),
    password: values.password,
  };
}

function trimForgotPasswordValues(
  values: ForgotPasswordFormValues,
): ForgotPasswordFormValues {
  return createForgotPasswordValues(values.email, true);
}

function normalizeAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
): string {
  return error?.message?.trim().toLowerCase() ?? "";
}

export function LoginShell(props: LoginShellProps) {
  return <LiveLoginShell {...props} />;
}

function LiveLoginShell({
  passwordSignIn = "on",
  resetError = null,
  resetToken = null,
  sso = null,
  ssoError = null,
}: LoginShellProps) {
  const router = useRouter();
  const { signupAvailable } = useBranding();
  const m = useAppMessages();
  const locale = useLocale();
  const [values, setValues] = useState<LoginFormValues>(
    createLoginFormValues(),
  );
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(
    resetError === "INVALID_TOKEN"
      ? m.login.invalidResetLink
      : ssoError
        ? describeSsoError(ssoError, m)
        : null,
  );
  // With password sign-in off, the form is only shown on request, for the
  // few addresses that keep a password for when single sign-on is down.
  const [showPasswordForm, setShowPasswordForm] = useState(
    passwordSignIn === "on",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState<ForgotPasswordModel>(
    createForgotPasswordModel(""),
  );
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  // The password was right and the account uses two-step sign-in.
  const [needsSecondStep, setNeedsSecondStep] = useState(false);

  function handleChange(field: keyof LoginFormValues) {
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
      setShowResendVerification(false);
    };
  }

  function openForgotPasswordModal() {
    setForgotPassword(
      createForgotPasswordModel(values.email.trim(), { isOpen: true }),
    );
  }

  function closeForgotPasswordModal() {
    if (forgotPassword.isSubmitting) {
      return;
    }

    setForgotPassword(createForgotPasswordModel(values.email.trim()));
  }

  function handleForgotPasswordChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;

    setForgotPassword((currentForgotPassword) => ({
      ...currentForgotPassword,
      bannerMessage: null,
      errors: {
        ...currentForgotPassword.errors,
        email: undefined,
      },
      successMessage: null,
      values: createForgotPasswordValues(nextValue),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedValues = trimLoginValues({
      email: String(formData.get("login-email") ?? values.email),
      password: String(formData.get("login-password") ?? values.password),
    });
    const validationResult = loginSchema.safeParse(trimmedValues);

    if (!validationResult.success) {
      const nextErrors: LoginFormErrors = {};

      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];

        if (field === "email") {
          nextErrors.email = m.common.enterValidEmail;
        }

        if (field === "password") {
          nextErrors.password = m.login.enterPassword;
        }
      }

      setValues(trimmedValues);
      setErrors(nextErrors);
      setBannerMessage(null);
      return;
    }

    setValues(validationResult.data);
    setErrors({});
    setBannerMessage(null);
    setShowResendVerification(false);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (result.error) {
      const normalizedErrorMessage = normalizeAuthErrorMessage(result.error);

      const errorCode = (result.error as AuthErrorLike).code;

      if (
        errorCode === "SIGN_IN_LOCKED" ||
        errorCode === "PASSWORD_SIGN_IN_OFF"
      ) {
        setBannerMessage(result.error.message ?? m.login.locked);
      } else if (normalizedErrorMessage.includes("email not verified")) {
        setBannerMessage(m.login.verificationRequired);
        setShowResendVerification(true);
      } else if (
        isPasswordTooLongMessage(describePasswordRefusal(result.error, locale))
      ) {
        // No account has a password this long, so it cannot be right. Say
        // why instead of "Something went wrong" (issue #57).
        setErrors({ password: describePasswordRefusal(result.error, locale)! });
      } else {
        setBannerMessage(
          normalizedErrorMessage.includes("invalid email or password")
            ? m.login.invalidCredentials
            : m.common.somethingWentWrong,
        );
      }
      setIsSubmitting(false);
      return;
    }

    if (
      result.data &&
      typeof result.data === "object" &&
      "twoFactorRedirect" in result.data
    ) {
      setNeedsSecondStep(true);
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
  }

  async function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (forgotPassword.isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedValues = trimForgotPasswordValues({
      email: String(
        formData.get("forgot-password-email") ?? forgotPassword.values.email,
      ),
    });
    const validationResult = forgotPasswordSchema.safeParse(trimmedValues);

    if (!validationResult.success) {
      setForgotPassword((currentForgotPassword) => ({
        ...currentForgotPassword,
        bannerMessage: null,
        errors: {
          email: m.common.enterValidEmail,
        },
        successMessage: null,
        values: trimmedValues,
      }));
      return;
    }

    setForgotPassword((currentForgotPassword) => ({
      ...currentForgotPassword,
      bannerMessage: null,
      errors: {},
      isSubmitting: true,
      successMessage: null,
      values: validationResult.data,
    }));

    const result = await authClient.requestPasswordReset({
      email: validationResult.data.email,
      redirectTo: `${window.location.origin}/login`,
    });

    setForgotPassword((currentForgotPassword) => ({
      ...currentForgotPassword,
      bannerMessage: result.error ? m.login.resetLinkFailed : null,
      errors: {},
      isSubmitting: false,
      successMessage: result.error ? null : m.login.resetLinkSent,
    }));
  }

  async function handleResendVerification() {
    const email = values.email.trim();

    if (!email || isResendingVerification) {
      return;
    }

    setIsResendingVerification(true);

    try {
      const response = await fetch("/api/auth/send-verification-email", {
        body: JSON.stringify({
          callbackURL: `${window.location.origin}/dashboard`,
          email,
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

      setBannerMessage(m.common.verificationSent);
    } catch {
      setBannerMessage(m.common.resendVerificationFailed);
    } finally {
      setIsResendingVerification(false);
    }
  }

  if (resetToken) {
    return <ResetPasswordCard resetToken={resetToken} />;
  }

  if (needsSecondStep) {
    return (
      <SecondStepCard
        onRestart={(message) => {
          setNeedsSecondStep(false);
          setValues((currentValues) => ({ ...currentValues, password: "" }));
          setBannerMessage(message);
        }}
        onSignedIn={() => router.replace("/dashboard")}
      />
    );
  }

  const formLocked = isSubmitting;
  const forgotPasswordLocked = forgotPassword.isSubmitting;

  return (
    <>
      <section className="panel w-full max-w-[460px] p-8 sm:p-10">
        <div className="space-y-7">
          <div className="space-y-2">
            <p className="section-eyebrow">{m.login.eyebrow}</p>
            <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
              {m.login.title}
            </h1>
          </div>

          {bannerMessage ? (
            <p className="notice notice-danger" role="alert">
              {bannerMessage}
            </p>
          ) : null}

          {sso ? (
            <SsoButton
              onError={setBannerMessage}
              sso={sso}
              variant={showPasswordForm ? "secondary" : "primary"}
            />
          ) : null}

          {sso && showPasswordForm ? (
            <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-(--secondary)">
              {m.common.or}
            </p>
          ) : null}

          {showPasswordForm ? (
            <>
              <form className="space-y-5" noValidate onSubmit={handleSubmit}>
                <FieldShell
                  autoComplete="email"
                  disabled={formLocked}
                  error={errors.email}
                  label={m.common.email}
                  name="login-email"
                  onChange={handleChange("email")}
                  placeholder={m.common.emailPlaceholder}
                  readOnly={formLocked}
                  type="email"
                  value={values.email}
                />
                <FieldShell
                  autoComplete="current-password"
                  disabled={formLocked}
                  error={errors.password}
                  label={m.common.password}
                  name="login-password"
                  onChange={handleChange("password")}
                  readOnly={formLocked}
                  type="password"
                  value={values.password}
                />
                <ShellButton
                  className="w-full"
                  disabled={formLocked}
                  loading={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? m.login.submitting : m.common.logIn}
                </ShellButton>
                {showResendVerification ? (
                  <ShellButton
                    className="w-full"
                    disabled={formLocked}
                    loading={isResendingVerification}
                    onClick={handleResendVerification}
                    type="button"
                    variant="secondary"
                  >
                    {isResendingVerification
                      ? m.common.sending
                      : m.common.resendVerification}
                  </ShellButton>
                ) : null}
              </form>
            </>
          ) : passwordSignIn === "fallback" ? (
            <button
              className="w-fit p-0 text-left text-sm font-bold text-(--accent-ink) underline-offset-4 hover:underline"
              onClick={() => setShowPasswordForm(true)}
              type="button"
            >
              {m.login.passwordInstead}
            </button>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-(--border) pt-5 text-sm text-(--secondary)">
            {showPasswordForm ? (
              <button
                className="w-fit p-0 text-left font-bold text-(--accent-ink) underline-offset-4 hover:underline"
                onClick={openForgotPasswordModal}
                type="button"
              >
                {m.login.forgotPassword}
              </button>
            ) : null}
            {signupAvailable ? (
              <p>
                {m.login.noAccount}{" "}
                <Link
                  className="font-bold text-(--accent-ink) underline-offset-4 hover:underline"
                  href="/signup"
                >
                  {m.common.signUp}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <ForgotPasswordDialog
        bannerMessage={forgotPassword.bannerMessage}
        email={forgotPassword.values.email}
        emailError={forgotPassword.errors.email}
        isOpen={forgotPassword.isOpen}
        isSubmitting={forgotPasswordLocked}
        onClose={closeForgotPasswordModal}
        onEmailChange={handleForgotPasswordChange}
        onSubmit={handleForgotPasswordSubmit}
        successMessage={forgotPassword.successMessage}
      />
    </>
  );
}

type ForgotPasswordDialogProps = {
  bannerMessage: string | null;
  email: string;
  emailError?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  successMessage: string | null;
};

function ForgotPasswordDialog({
  bannerMessage,
  email,
  emailError,
  isOpen,
  isSubmitting,
  onClose,
  onEmailChange,
  onSubmit,
  successMessage,
}: ForgotPasswordDialogProps) {
  const m = useAppMessages();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[560px] sm:p-8" showCloseButton={false}>
        <div className="space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle>{m.forgotPassword.title}</DialogTitle>
            <DialogDescription className="max-w-[40ch]">
              {m.forgotPassword.description}
            </DialogDescription>
          </DialogHeader>

          {bannerMessage ? (
            <p className="notice notice-danger" role="alert">
              {bannerMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="notice notice-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <form className="space-y-6" noValidate onSubmit={onSubmit}>
            <FieldShell
              autoComplete="email"
              disabled={isSubmitting}
              error={emailError}
              label={m.common.email}
              name="forgot-password-email"
              onChange={onEmailChange}
              placeholder={m.common.emailPlaceholder}
              readOnly={isSubmitting}
              type="email"
              value={email}
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <ShellButton
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
                variant="secondary"
              >
                {m.common.cancel}
              </ShellButton>
              <ShellButton
                disabled={isSubmitting}
                loading={isSubmitting}
                type="submit"
              >
                {isSubmitting ? m.common.sending : m.forgotPassword.submit}
              </ShellButton>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordCard({ resetToken }: { resetToken: string }) {
  const m = useAppMessages();
  const locale = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const trimmedPassword = String(
      formData.get("reset-password") ?? password,
    ).trim();

    const lengthError = newPasswordLengthError(trimmedPassword, locale);

    if (lengthError) {
      setError(lengthError);
      setSuccessMessage(null);
      return;
    }

    setPassword(trimmedPassword);
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await authClient.resetPassword({
      newPassword: trimmedPassword,
      token: resetToken,
    });

    if (result.error) {
      const normalizedErrorMessage = normalizeAuthErrorMessage(result.error);

      setError(
        normalizedErrorMessage.includes("invalid token")
          ? m.login.invalidResetLink
          : (describePasswordRefusal(result.error, locale) ??
              m.common.somethingWentWrong),
      );
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(m.resetPassword.success);
    setIsSubmitting(false);
  }

  const formLocked = isSubmitting;

  return (
    <section className="panel w-full max-w-[440px] p-8 sm:p-10">
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="section-eyebrow">{m.resetPassword.eyebrow}</p>
          <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
            {m.resetPassword.title}
          </h1>
        </div>

        {error ? (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="notice notice-success" role="status">
            {successMessage}
          </p>
        ) : null}

        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <FieldShell
            autoComplete="new-password"
            disabled={formLocked}
            error={error ?? undefined}
            helper={m.common.passwordMinLengthHelper}
            label={m.resetPassword.newPassword}
            name="reset-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            readOnly={formLocked}
            type="password"
            value={password}
          />
          <ShellButton
            className="w-full"
            disabled={formLocked}
            loading={isSubmitting}
            type="submit"
          >
            {isSubmitting ? m.resetPassword.submitting : m.resetPassword.submit}
          </ShellButton>
        </form>
      </div>
    </section>
  );
}

type SecondStepCardProps = {
  /** Back to the password, with a reason to show there. */
  onRestart: (message: string) => void;
  onSignedIn: () => void;
};

function SecondStepCard({ onRestart, onSignedIn }: SecondStepCardProps) {
  const m = useAppMessages();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmed = code.replace(/\s+/g, "");

    if (!useBackupCode && !/^\d{6}$/.test(trimmed)) {
      setError(m.secondStep.enterSixDigits);
      return;
    }

    if (useBackupCode && trimmed.length === 0) {
      setError(m.secondStep.enterBackupCode);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        useBackupCode
          ? "/api/auth/two-factor/verify-backup-code"
          : "/api/auth/two-factor/verify-totp",
        {
          body: JSON.stringify({ code: trimmed }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      if (response.ok) {
        onSignedIn();
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;

      switch (payload?.code) {
        case "INVALID_CODE":
          setError(m.secondStep.invalidCode);
          break;
        case "INVALID_BACKUP_CODE":
          setError(m.secondStep.invalidBackupCode);
          break;
        case "ACCOUNT_TEMPORARILY_LOCKED":
          setError(m.secondStep.locked);
          break;
        case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
          onRestart(m.secondStep.tooManyAttempts);
          return;
        case "INVALID_TWO_FACTOR_COOKIE":
          onRestart(m.secondStep.tooSlow);
          return;
        default:
          setError(m.common.somethingWentWrong);
      }
    } catch {
      setError(m.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel w-full max-w-[460px] p-8 sm:p-10">
      <div className="space-y-7">
        <div className="space-y-2">
          <p className="section-eyebrow">{m.secondStep.eyebrow}</p>
          <h1 className="text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-(--fg)">
            {useBackupCode ? m.secondStep.titleBackup : m.secondStep.titleCode}
          </h1>
          <p className="text-sm leading-6 text-(--secondary)">
            {useBackupCode
              ? m.secondStep.descriptionBackup
              : m.secondStep.descriptionCode}
          </p>
        </div>

        {error ? (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        ) : null}

        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <FieldShell
            autoComplete="one-time-code"
            disabled={isSubmitting}
            label={
              useBackupCode ? m.secondStep.labelBackup : m.secondStep.labelCode
            }
            name="second-step-code"
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            readOnly={isSubmitting}
            value={code}
          />
          <ShellButton
            className="w-full"
            disabled={isSubmitting}
            loading={isSubmitting}
            type="submit"
          >
            {isSubmitting ? m.secondStep.submitting : m.common.continue}
          </ShellButton>
        </form>

        <div className="border-t border-(--border) pt-5 text-sm">
          <button
            className="w-fit p-0 text-left font-bold text-(--accent-ink) underline-offset-4 hover:underline"
            onClick={() => {
              setUseBackupCode((current) => !current);
              setCode("");
              setError(null);
            }}
            type="button"
          >
            {useBackupCode ? m.secondStep.useApp : m.secondStep.useBackup}
          </button>
        </div>
      </div>
    </section>
  );
}
