import { type ResolvedSettings } from "../settings.ts";
import { type EnvSource } from "../utils/env.ts";
import {
  buildEmailAddresses,
  type EmailAddresses,
  extractEmailAddress,
  getAddressDomain,
  isResendTestSender,
} from "./email-addresses.ts";
import type {
  EmailDeliveryResult,
  EmailService,
  TransactionalEmailMessage,
} from "./email.ts";
import { ServiceConfigurationError } from "./service-config.ts";

// Sending through Cloudflare Email Service, chosen with EMAIL_DRIVER=cloudflare.
// It uses the REST API, which any Node.js server can call, with an API token
// that is allowed to send email for the account.
// https://developers.cloudflare.com/email-service/
//
// The address mail is sent from must be at a domain that has Email Sending
// turned on in that Cloudflare account. Cloudflare has no shared test
// address, so nothing can be sent until "Send email from" is set.
//
// Two things work differently from Resend:
// - There is no batch call, so a batch is sent one message at a time.
// - There is no idempotency key, so the one passed in is not used. A send
//   that is tried again after a lost answer can arrive twice.

const API_BASE_URL = "https://api.cloudflare.com/client/v4";
const REQUIRED_VARIABLES = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_EMAIL_API_TOKEN",
] as const;

/** How often a send that was turned away for rate, or by a fault, is tried again. */
const RETRIES = 3;
const DEFAULT_RETRY_WAIT_MS = 1_000;
const MAX_RETRY_WAIT_MS = 5_000;

type CreateCloudflareEmailServiceOptions = {
  env?: EnvSource;
  /** Replaced by a fake in tests. */
  fetch?: typeof fetch;
  resolveAddresses: () => Promise<EmailAddresses>;
  wait: (milliseconds: number) => Promise<void>;
};

type SendResponse = {
  errors?: Array<{ code?: number; message?: string }>;
  result?: {
    delivered?: string[];
    permanent_bounces?: string[];
    queued?: string[];
  } | null;
  success?: boolean;
};

/** "Acme <sign@acme.com>" becomes { address: "sign@acme.com", name: "Acme" }. */
function toAddressObject(value: string): { address: string; name?: string } {
  const match = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(value);

  if (!match) {
    return { address: value.trim() };
  }

  const name = match[1].replace(/^"|"$/g, "").trim();

  return name
    ? { address: match[2].trim(), name }
    : { address: match[2].trim() };
}

function buildPayload(
  message: TransactionalEmailMessage,
  config: EmailAddresses,
) {
  const replyTo = message.replyTo ?? config.supportAddress ?? undefined;

  return {
    ...(message.attachments?.length
      ? {
          attachments: message.attachments.map((attachment) => ({
            content: Buffer.from(attachment.content).toString("base64"),
            disposition: "attachment",
            filename: attachment.filename,
            type: attachment.contentType,
          })),
        }
      : {}),
    from: toAddressObject(config.senderAddress),
    ...(message.htmlBody ? { html: message.htmlBody } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: message.subject,
    text: message.textBody,
    to: message.to,
  };
}

function retryWaitMs(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));

  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, MAX_RETRY_WAIT_MS)
    : DEFAULT_RETRY_WAIT_MS;
}

export function createCloudflareEmailService({
  env = process.env,
  fetch: send = fetch,
  resolveAddresses,
  wait,
}: CreateCloudflareEmailServiceOptions): EmailService {
  const missing = REQUIRED_VARIABLES.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new ServiceConfigurationError("email", missing);
  }

  const url = `${API_BASE_URL}/accounts/${encodeURIComponent(
    env.CLOUDFLARE_ACCOUNT_ID!.trim(),
  )}/email/sending/send`;
  const token = env.CLOUDFLARE_EMAIL_API_TOKEN!.trim();

  async function sendOne(
    message: TransactionalEmailMessage,
  ): Promise<EmailDeliveryResult> {
    const body = JSON.stringify(
      buildPayload(message, await resolveAddresses()),
    );

    for (let attempt = 0; ; attempt += 1) {
      const response = await send(url, {
        body,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        method: "POST",
      });

      // A rate limit or a fault on Cloudflare's side refuses the message
      // instead of queueing it, so it would be lost: a signer would never
      // get their copy. Those are tried again. Anything else is final.
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < RETRIES
      ) {
        await response.body?.cancel();
        await wait(retryWaitMs(response));
        continue;
      }

      const answer = (await response
        .json()
        .catch(() => null)) as SendResponse | null;

      if (!response.ok || !answer?.success) {
        throw new Error(
          answer?.errors?.[0]?.message ||
            `Email delivery failed (${response.status}).`,
        );
      }

      // Cloudflare knows the address does not exist. That is a failure to
      // whoever asked for the message, not a delivery.
      if (answer.result?.permanent_bounces?.length) {
        throw new Error(`Email to ${message.to} bounced.`);
      }

      return { accepted: [message.to], rejected: [] };
    }
  }

  return {
    send: (message) => sendOne(message),
    async sendBatch(messages) {
      const results: EmailDeliveryResult[] = [];

      for (const message of messages) {
        results.push(await sendOne(message));
      }

      return results;
    },
  };
}

/**
 * What Settings shows about email with this driver. Cloudflare is not asked
 * about the domain: a test email that arrives is what marks email as
 * working, as it does for a Resend key that may only send.
 */
export function describeCloudflareEmail(
  settings: ResolvedSettings,
):
  | { state: "cloudflare"; senderAddress: string | null }
  | { state: "ready"; domain: string; senderAddress: string } {
  const senderAddress = extractEmailAddress(
    buildEmailAddresses(settings).senderAddress,
  );
  const domain = getAddressDomain(senderAddress);

  // With no address of its own the install falls back to Resend's test
  // address, which Cloudflare cannot send from.
  if (!domain || isResendTestSender(senderAddress)) {
    return { senderAddress: null, state: "cloudflare" };
  }

  return settings.emailReadyAt === null
    ? { senderAddress, state: "cloudflare" }
    : { domain, senderAddress, state: "ready" };
}
