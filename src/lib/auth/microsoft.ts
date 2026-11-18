import { readEnv, type EnvSource } from "../utils/env.ts";

// Microsoft 365 sign-in over the same OpenID Connect wiring as the
// organization's own provider (sso.ts), for installs whose people are in one
// Microsoft directory — or, with MICROSOFT_TENANT_ID unset (common), anyone
// with a Microsoft account. It is off unless the deployer sets both
// MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET, and both buttons may show
// at once when the install has a provider of each kind.
//
// First sign-ins make an account under the install's sign-up rule, the same
// as any other sign-in (settings.ts), and PASSWORD_SIGN_IN=off then turns
// passwords off for everyone but the break-glass addresses (sso.ts).

/** The provider id in Better Auth: its routes end in /oauth2/callback/microsoft. */
export const MICROSOFT_PROVIDER_ID = "microsoft";

/** What the button says after "Continue with". */
export const MICROSOFT_NAME = "Microsoft";

export type MicrosoftConfig = {
  clientId: string;
  clientSecret: string;
  /**
   * "common", "organizations" or "consumers" to let Microsoft decide who
   * signs in, or one directory's GUID to allow only that organization.
   */
  tenantId: string;
  /** The directory's discovery document. */
  discoveryUrl: string;
};

const TENANT_ALIASES = new Set(["common", "organizations", "consumers"]);
const TENANT_GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeTenantId(value: string): string | null {
  return TENANT_ALIASES.has(value) || TENANT_GUID.test(value) ? value : null;
}

/**
 * The install's Microsoft 365 sign-in settings, or null when it is not set
 * up. As with single sign-on, a partial or broken setting is reported once
 * and treated as not set up, so a typo cannot stop password sign-in from
 * working.
 */
export function readMicrosoftConfig(
  env: EnvSource = process.env,
): MicrosoftConfig | null {
  const clientId = readEnv(env, "MICROSOFT_CLIENT_ID");
  const clientSecret = readEnv(env, "MICROSOFT_CLIENT_SECRET");

  if (!clientId && !clientSecret) {
    return null;
  }

  if (!clientId || !clientSecret) {
    warnOnce(
      "Microsoft sign-in is turned off: set both MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.",
    );
    return null;
  }

  const tenantId = normalizeTenantId(
    readEnv(env, "MICROSOFT_TENANT_ID") ?? "common",
  );

  if (!tenantId) {
    warnOnce(
      'Microsoft sign-in is turned off: MICROSOFT_TENANT_ID must be "common", "organizations", "consumers" or your directory\'s GUID.',
    );
    return null;
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    discoveryUrl: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
  };
}

const warned = new Set<string>();

function warnOnce(message: string) {
  if (!warned.has(message)) {
    warned.add(message);
    console.warn(`[auth] ${message}`);
  }
}
