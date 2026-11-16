import assert from "node:assert/strict";
import { test } from "node:test";

import { getEmailStatus } from "../email-status.ts";
import { type ResolvedSettings } from "../settings.ts";
import {
  createCloudflareEmailService,
  describeCloudflareEmail,
} from "./email-cloudflare.ts";
import {
  createEmailService,
  resolveEmailDriver,
  type TransactionalEmailMessage,
} from "./email.ts";
import { ServiceConfigurationError } from "./service-config.ts";

const env = {
  CLOUDFLARE_ACCOUNT_ID: "account123",
  CLOUDFLARE_EMAIL_API_TOKEN: "test-token",
  EMAIL_DRIVER: "cloudflare",
};

const addresses = {
  senderAddress: "Acme Ltd <sign@acme.example>",
  supportAddress: "help@acme.example",
};

const message: TransactionalEmailMessage = {
  htmlBody: "<p>Please sign.</p>",
  subject: "Please sign",
  template: "signing_invitation",
  textBody: "Please sign.",
  to: "signer@example.com",
};

function delivered(to: string): Response {
  return Response.json({
    errors: [],
    result: { delivered: [to], permanent_bounces: [], queued: [] },
    success: true,
  });
}

// A stand-in for Cloudflare's API that answers from a list and records what
// it was sent.
function createFakeApi(answers: Array<() => Response>) {
  const calls: Array<{
    body: Record<string, unknown>;
    headers: Headers;
    url: string;
  }> = [];
  const waits: number[] = [];
  const send = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      body: JSON.parse(String(init?.body)),
      headers: new Headers(init?.headers),
      url: String(input),
    });

    const answer = answers.shift();

    assert.ok(answer, "the API was called more often than expected");

    return answer();
  }) as typeof fetch;
  const service = createCloudflareEmailService({
    env,
    fetch: send,
    resolveAddresses: async () => addresses,
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  return { calls, service, waits };
}

test("sends one message the way Cloudflare's API expects", async () => {
  const api = createFakeApi([() => delivered(message.to)]);
  const result = await api.service.send(message, { idempotencyKey: "abc" });

  assert.deepEqual(result, { accepted: ["signer@example.com"], rejected: [] });
  assert.equal(api.calls.length, 1);
  assert.equal(
    api.calls[0].url,
    "https://api.cloudflare.com/client/v4/accounts/account123/email/sending/send",
  );
  assert.equal(api.calls[0].headers.get("authorization"), "Bearer test-token");
  assert.deepEqual(api.calls[0].body, {
    from: { address: "sign@acme.example", name: "Acme Ltd" },
    html: "<p>Please sign.</p>",
    reply_to: "help@acme.example",
    subject: "Please sign",
    text: "Please sign.",
    to: "signer@example.com",
  });
});

test("attachments go as base64, and a reply address of the message's own wins", async () => {
  const api = createFakeApi([() => delivered(message.to)]);

  await api.service.send({
    ...message,
    attachments: [
      {
        content: new TextEncoder().encode("%PDF-1.7"),
        contentType: "application/pdf",
        filename: "signed.pdf",
      },
    ],
    replyTo: "sender@acme.example",
  });

  assert.equal(api.calls[0].body.reply_to, "sender@acme.example");
  assert.deepEqual(api.calls[0].body.attachments, [
    {
      content: Buffer.from("%PDF-1.7").toString("base64"),
      disposition: "attachment",
      filename: "signed.pdf",
      type: "application/pdf",
    },
  ]);
});

test("a send turned away for rate, or by a fault, is tried again", async () => {
  const api = createFakeApi([
    () => new Response(null, { headers: { "retry-after": "2" }, status: 429 }),
    () => new Response(null, { status: 503 }),
    () => delivered(message.to),
  ]);

  await api.service.send(message);

  assert.equal(api.calls.length, 3);
  assert.deepEqual(api.waits, [2000, 1000]);
});

test("it gives up after three more tries", async () => {
  const api = createFakeApi(
    Array.from({ length: 4 }, () => () => new Response(null, { status: 429 })),
  );

  await assert.rejects(api.service.send(message), /429/);
  assert.equal(api.calls.length, 4);
});

test("a refusal is reported with Cloudflare's message, and not retried", async () => {
  const api = createFakeApi([
    () =>
      Response.json(
        {
          errors: [{ code: 1000, message: "Sender domain not verified" }],
          result: null,
          success: false,
        },
        { status: 400 },
      ),
  ]);

  await assert.rejects(api.service.send(message), /Sender domain not verified/);
  assert.equal(api.calls.length, 1);
});

test("an address Cloudflare says does not exist is a failure", async () => {
  const api = createFakeApi([
    () =>
      Response.json({
        errors: [],
        result: {
          delivered: [],
          permanent_bounces: [message.to],
          queued: [],
        },
        success: true,
      }),
  ]);

  await assert.rejects(api.service.send(message), /bounced/);
});

test("a batch is sent one message at a time", async () => {
  const second = { ...message, to: "second@example.com" };
  const api = createFakeApi([
    () => delivered(message.to),
    () => delivered(second.to),
  ]);
  const results = await api.service.sendBatch([message, second]);

  assert.deepEqual(
    results.map((result) => result.accepted),
    [["signer@example.com"], ["second@example.com"]],
  );
  assert.deepEqual(
    api.calls.map((call) => call.body.to),
    ["signer@example.com", "second@example.com"],
  );
});

test("EMAIL_DRIVER=cloudflare selects this driver and names what is missing", () => {
  assert.equal(resolveEmailDriver(env), "cloudflare");
  assert.equal(resolveEmailDriver({}), "resend");
  assert.throws(
    () =>
      createEmailService({
        env: { EMAIL_DRIVER: "cloudflare" },
        resolveAddresses: async () => addresses,
      }),
    (error: unknown) =>
      error instanceof ServiceConfigurationError &&
      /CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_API_TOKEN$/.test(error.message),
  );
});

function settingsWith(overrides: Partial<ResolvedSettings>): ResolvedSettings {
  return {
    emailReadyAt: null,
    hosted: false,
    organizationName: "Acme Ltd",
    senderAddress: null,
    supportAddress: null,
    ...overrides,
  } as ResolvedSettings;
}

test("Settings asks for a sender address, then a test email, then says ready", async () => {
  assert.deepEqual(describeCloudflareEmail(settingsWith({})), {
    senderAddress: null,
    state: "cloudflare",
  });
  assert.deepEqual(
    describeCloudflareEmail(
      settingsWith({ senderAddress: "sign@acme.example" }),
    ),
    { senderAddress: "sign@acme.example", state: "cloudflare" },
  );
  assert.deepEqual(
    describeCloudflareEmail(
      settingsWith({
        emailReadyAt: 1_700_000_000,
        senderAddress: "sign@acme.example",
      }),
    ),
    {
      domain: "acme.example",
      senderAddress: "sign@acme.example",
      state: "ready",
    },
  );

  // The status check reports the same, without a Resend key to ask with.
  assert.deepEqual(
    await getEmailStatus({
      env: { EMAIL_DRIVER: "cloudflare" },
      settings: settingsWith({ senderAddress: "sign@acme.example" }),
    }),
    { senderAddress: "sign@acme.example", state: "cloudflare" },
  );
});
