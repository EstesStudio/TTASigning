import { LoginShell } from "@/components/auth/login-shell";
import { redirectIfSignedIn } from "@/lib/auth/server";
import {
  MICROSOFT_NAME,
  MICROSOFT_PROVIDER_ID,
  readMicrosoftConfig,
} from "@/lib/auth/microsoft";
import { readPasswordSignInPolicy, readSsoConfig } from "@/lib/auth/sso";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    token?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // A link from a password reset email is for this page whoever is signed
  // in, so it is shown as it is.
  if (!resolvedSearchParams?.token && !resolvedSearchParams?.error) {
    await redirectIfSignedIn();
  }

  const error = resolvedSearchParams?.error ?? null;
  const sso = readSsoConfig();
  const microsoft = readMicrosoftConfig();
  const passwordPolicy = readPasswordSignInPolicy();

  return (
    <LoginShell
      microsoft={
        microsoft
          ? { name: MICROSOFT_NAME, providerId: MICROSOFT_PROVIDER_ID }
          : null
      }
      passwordSignIn={
        passwordPolicy.enabled
          ? "on"
          : passwordPolicy.allowedEmails.length > 0
            ? "fallback"
            : "off"
      }
      resetError={error === "INVALID_TOKEN" ? error : null}
      resetToken={resolvedSearchParams?.token ?? null}
      sso={sso ? { name: sso.name } : null}
      // Anything else is single sign-on coming back without a session.
      ssoError={error && error !== "INVALID_TOKEN" ? error.slice(0, 80) : null}
    />
  );
}
