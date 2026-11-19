import { logSecurityEvent } from "./logging.ts";

type IpEnv = Record<string, string | undefined>;

function firstAddress(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function addressesIn(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address !== "");
}

const DEFAULT_TRUSTED_PROXY_HOPS = 0;
let warnedAboutTrustedProxyHops = false;

/**
 * How many addresses at the right end of a forwarded header were written by
 * our own proxies for each other, rather than about the visitor. The address
 * that many places plus one from the right is then the first one written by
 * a proxy of ours about the visitor.
 *
 * Nothing stops a visitor who reaches the first proxy of ours directly from
 * naming any address in these headers, so a count of 0 trusts that proxy to
 * have written what it saw; an install reachable without a proxy in front of
 * it stays readable as whatever the visitor sent, which only the socket
 * could tell apart.
 */
function trustedProxyHops(env: IpEnv): number {
  const raw = env.TRUSTED_PROXY_HOPS?.trim();

  if (raw === undefined || raw === "") {
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }

  if (!/^\d+$/.test(raw)) {
    // One line per process is enough to get the setting fixed; this runs on
    // every request that carries the headers.
    if (!warnedAboutTrustedProxyHops) {
      warnedAboutTrustedProxyHops = true;

      logSecurityEvent("warn", {
        category: "client_ip_config",
        message:
          "TRUSTED_PROXY_HOPS is not a whole number of 0 or more; treating it as 0.",
        metadata: { variable: "TRUSTED_PROXY_HOPS", value: raw },
      });
    }

    return DEFAULT_TRUSTED_PROXY_HOPS;
  }

  return Number(raw);
}

/**
 * The address HOPS + 1 places from the right, or null when the header names
 * fewer addresses than that: with more hops configured than a request shows,
 * none of them can be trusted and the next header is tried instead.
 */
function addressFromRight(value: string | null, hops: number): string | null {
  const addresses = addressesIn(value);

  return hops < addresses.length
    ? addresses[addresses.length - 1 - hops]
    : null;
}

/**
 * The headers that carry the visitor's address, most trustworthy first.
 *
 * On Vercel, x-vercel-forwarded-for and x-real-ip are written by Vercel
 * itself and cannot be set by the visitor, so they come first.
 * https://vercel.com/docs/headers/request-headers
 *
 * Anywhere else those two names mean nothing special and anyone could send
 * them, so the usual proxy headers are used instead.
 */
export function getClientIpHeaderNames(env: IpEnv = process.env): string[] {
  return env.VERCEL === "1"
    ? ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"]
    : ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"];
}

export function getClientIpAddress(
  headers: Headers,
  env: IpEnv = process.env,
): string | null {
  const onVercel = env.VERCEL === "1";
  // Off Vercel the leftmost address is the one the visitor sent, so the
  // trusted hops are counted from the right. On Vercel the first headers are
  // written by the platform and stay read as they always were.
  const hops = onVercel ? 0 : trustedProxyHops(env);

  for (const name of getClientIpHeaderNames(env)) {
    const address = onVercel
      ? firstAddress(headers.get(name))
      : addressFromRight(headers.get(name), hops);

    if (address) {
      return address;
    }
  }

  return null;
}

export function getRequestUserAgent(headers: Headers): string | null {
  // A header sent with no value reads as "", which the audit schema
  // rejects; it counts as no user agent at all.
  return headers.get("user-agent")?.trim() || null;
}

export function getRequestPathname(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/";
  }
}
