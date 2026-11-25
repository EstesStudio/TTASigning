import assert from "node:assert/strict";
import { test } from "node:test";

import type { Resend } from "resend";

import {
  applySmtpSettingsUpdate,
  NO_STORED_SMTP_SETTINGS,
} from "../smtp-settings.ts";
import {
  canSendEmail,
  checkSmtpConnection,
  createConnectedEmailService,
  createEmailService,
  createLazyEmailService,
  type EmailService,
  isEmailNotConnectedError,
  readSmtpSettings,
  resolveEmailDriver,
  resolveSmtpOptions,
  type SmtpIdempotencyStore,
  type SmtpTransport,
} from "./email.ts";

// What the Resend client is asked to do when the service turns a request
// away for rate. Nothing here talks to Resend.

type Answer = {
  data: { id: string } | null;
  error: { message: string; name: string; statusCode: number } | null;
  headers: Record<string, string> | null;
};

const RATE_LIMITED: Answer = {
  data: null,
  error: {
    message:
      "Too many requests. Please limit the number of requests per second.",
    name: "rate_limit_exceeded",
    statusCode: 429,
  },
  headers: { "retry-after": "1" },
};

const SENT: Answer = { data: { id: "email_1" }, error: null, headers: {} };

const MESSAGE = {
  subject: "Your signed copy",
  template: "completion_notification" as const,
  textBody: "Attached.",
  to: "signer@example.test",
};

/** An email service whose Resend client gives these answers, in order. */
function serviceAnswering(answers: Answer[]) {
  const waits: number[] = [];
  let requests = 0;
  const next = async () => {
    const answer = answers[Math.min(requests, answers.length - 1)];

    requests += 1;

    return answer;
  };
  const service = createEmailService({
    resendClient: {
      batch: { send: next },
      emails: { send: next },
    } as unknown as Resend,
    resolveAddresses: async () => ({
      senderAddress: "Example <hello@example.test>",
      supportAddress: null,
    }),
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  return { requests: () => requests, service, waits };
}

test("a message Resend turns away for rate is sent again after the wait it names", async () => {
  const { requests, service, waits } = serviceAnswering([
    RATE_LIMITED,
    { ...RATE_LIMITED, headers: { "retry-after": "2" } },
    SENT,
  ]);

  const delivery = await service.send(MESSAGE);

  assert.equal(delivery.messageId, "email_1");
  assert.equal(requests(), 3);
  assert.deepEqual(waits, [1000, 2000]);
});

test("a rate limit that does not clear is reported after a few tries", async () => {
  const { requests, service, waits } = serviceAnswering([RATE_LIMITED]);

  await assert.rejects(service.send(MESSAGE), /Too many requests/);
  // The first try and three more.
  assert.equal(requests(), 4);
  assert.equal(waits.length, 3);
});

test("the wait is a second when Resend names none, and is never long", async () => {
  const { service, waits } = serviceAnswering([
    { ...RATE_LIMITED, headers: null },
    { ...RATE_LIMITED, headers: { "retry-after": "3600" } },
    SENT,
  ]);

  await service.send(MESSAGE);

  assert.deepEqual(waits, [1000, 5000]);
});

test("a used-up quota is reported at once: waiting a second does not bring it back", async () => {
  const { requests, service, waits } = serviceAnswering([
    {
      data: null,
      error: {
        message: "You have exceeded your daily email sending quota.",
        name: "daily_quota_exceeded",
        statusCode: 429,
      },
      headers: { "retry-after": "1" },
    },
  ]);

  await assert.rejects(service.send(MESSAGE), /daily email sending quota/);
  assert.equal(requests(), 1);
  assert.deepEqual(waits, []);
});

test("a batch turned away for rate is sent again too", async () => {
  const { requests, service } = serviceAnswering([
    RATE_LIMITED,
    {
      data: { data: [{ id: "email_1" }] } as unknown as { id: string },
      error: null,
      headers: {},
    },
  ]);

  const deliveries = await service.sendBatch([MESSAGE]);

  assert.equal(deliveries[0]?.messageId, "email_1");
  assert.equal(requests(), 2);
});

test("a lazy email service is only built when it first sends, and only once", async () => {
  let built = 0;
  const service = createLazyEmailService(() => {
    built += 1;

    return {
      async send(message) {
        return { accepted: [message.to], messageId: "m-1", rejected: [] };
      },
      async sendBatch() {
        return [];
      },
    } satisfies EmailService;
  });

  assert.equal(built, 0);
  await service.send(MESSAGE);
  await service.sendBatch([MESSAGE]);
  assert.equal(built, 1);
});

test("a lazy email service with no provider fails the send, not its creation (issue #96)", async () => {
  const service = createLazyEmailService(() => createEmailService({ env: {} }));

  await assert.rejects(service.send(MESSAGE), /RESEND_API_KEY/);
});

test("signup knows when there is no email provider to send with (issue #95)", async () => {
  assert.equal(await canSendEmail({ NODE_ENV: "production" }), false);
  assert.equal(
    await canSendEmail({ NODE_ENV: "production", RESEND_API_KEY: "re_test" }),
    true,
  );
  assert.equal(
    await canSendEmail({ EMAIL_DRIVER: "capture", NODE_ENV: "development" }),
    true,
  );
  // The capture driver drops mail, so a real site cannot count on it.
  assert.equal(
    await canSendEmail({
      APP_URL: "https://sign.example.com",
      EMAIL_DRIVER: "capture",
      NODE_ENV: "production",
    }),
    false,
  );
});

test("EMAIL_DRIVER=smtp is a driver of its own", () => {
  assert.equal(resolveEmailDriver({ EMAIL_DRIVER: "smtp" }), "smtp");
  assert.equal(resolveEmailDriver({ EMAIL_DRIVER: " SMTP " }), "smtp");
  assert.throws(() => resolveEmailDriver({ EMAIL_DRIVER: "sendmail" }), /smtp/);
});

test("the SMTP driver needs a host, a user and a password", async () => {
  const smtp = { EMAIL_DRIVER: "smtp", NODE_ENV: "production" };
  const nothingSaved = async () => NO_STORED_SMTP_SETTINGS;

  assert.equal(await canSendEmail(smtp, nothingSaved), false);
  assert.equal(
    await canSendEmail(
      {
        ...smtp,
        SMTP_HOST: "smtp.example.test",
        SMTP_USER: "sign@example.test",
      },
      nothingSaved,
    ),
    false,
  );
  assert.equal(
    await canSendEmail(
      {
        ...smtp,
        SMTP_HOST: "smtp.example.test",
        SMTP_PASSWORD: "secret",
        SMTP_USER: "sign@example.test",
      },
      nothingSaved,
    ),
    true,
  );
});

test("an SMTP server saved in Settings is used where the environment sets none", async () => {
  const env = { BETTER_AUTH_SECRET: "a".repeat(64), EMAIL_DRIVER: "smtp" };
  const { next: saved } = applySmtpSettingsUpdate(
    NO_STORED_SMTP_SETTINGS,
    { host: "smtp.example.test", password: "saved-secret", port: 587 },
    env,
  );

  // Saved without a user: still not enough to send.
  assert.equal(await canSendEmail(env, async () => saved), false);
  await assert.rejects(
    createConnectedEmailService(env, async () => saved),
    (error: unknown) => isEmailNotConnectedError(error),
  );

  const withUser = { ...saved, user: "sign@example.test" };

  assert.equal(await canSendEmail(env, async () => withUser), true);
  assert.deepEqual(
    await resolveSmtpOptions(
      { ...env, SMTP_USER: "env@example.test" },
      async () => withUser,
    ),
    {
      auth: { pass: "saved-secret", user: "env@example.test" },
      host: "smtp.example.test",
      port: 587,
      requireTLS: true,
      secure: false,
    },
  );
});

test("checking the SMTP connection reports the server's answer, never the password", async () => {
  const env = {
    EMAIL_DRIVER: "smtp",
    SMTP_HOST: "smtp.example.test",
    SMTP_PASSWORD: "pa55-word",
    SMTP_PORT: "587",
    SMTP_USER: "sign@example.test",
  };
  const connected: Record<string, unknown>[] = [];

  const accepted = await checkSmtpConnection({
    connect: (options) => {
      connected.push(options);
      return { verify: async () => true as const };
    },
    env,
    storedSmtp: async () => NO_STORED_SMTP_SETTINGS,
  });

  assert.deepEqual(accepted, {
    message: "smtp.example.test:587 accepted the connection and the login.",
    ok: true,
  });
  // A server that never answers is given up on while the admin waits.
  assert.equal(typeof connected[0]?.connectionTimeout, "number");

  const refused = await checkSmtpConnection({
    connect: () => ({
      verify: async () => {
        throw new Error("Invalid login: 535 Bad credentials for pa55-word");
      },
    }),
    env,
    storedSmtp: async () => NO_STORED_SMTP_SETTINGS,
  });

  assert.equal(refused.ok, false);
  assert.match(refused.message, /smtp\.example\.test:587/);
  assert.match(refused.message, /535 Bad credentials/);
  assert.ok(!refused.message.includes("pa55-word"));

  let tried = false;
  const unset = await checkSmtpConnection({
    connect: () => {
      tried = true;
      return { verify: async () => true as const };
    },
    env: { EMAIL_DRIVER: "smtp" },
    storedSmtp: async () => NO_STORED_SMTP_SETTINGS,
  });

  assert.deepEqual(unset, {
    message: "Enter the SMTP server, user name and password first.",
    ok: false,
  });
  assert.equal(tried, false);
});

test("SMTP uses TLS on port 465 and requires STARTTLS on other ports", () => {
  const base = {
    SMTP_HOST: " smtp.example.test ",
    SMTP_PASSWORD: "secret",
    SMTP_USER: "sign@example.test",
  };

  assert.deepEqual(readSmtpSettings(base), {
    auth: { pass: "secret", user: "sign@example.test" },
    host: "smtp.example.test",
    port: 465,
    requireTLS: false,
    secure: true,
  });
  assert.deepEqual(
    { ...readSmtpSettings({ ...base, SMTP_PORT: "587" }), auth: undefined },
    {
      auth: undefined,
      host: "smtp.example.test",
      port: 587,
      requireTLS: true,
      secure: false,
    },
  );
  assert.equal(
    readSmtpSettings({ ...base, SMTP_PORT: "2525", SMTP_SECURE: "true" })
      .secure,
    true,
  );
  assert.throws(
    () => readSmtpSettings({ ...base, SMTP_PORT: "smtp" }),
    /SMTP_PORT/,
  );
});

test("the SMTP driver sends each message with the install's addresses", async () => {
  const sent: Record<string, unknown>[] = [];
  const transport: SmtpTransport = {
    sendMail: (async (mail: Record<string, unknown>) => {
      sent.push(mail);

      return {
        accepted: [mail.to],
        messageId: `<${String(sent.length)}@example.test>`,
        rejected: [],
      };
    }) as unknown as SmtpTransport["sendMail"],
  };
  const service = createEmailService({
    resolveAddresses: async () => ({
      senderAddress: "Example <hello@example.test>",
      supportAddress: "help@example.test",
    }),
    smtpIdempotency: memoryIdempotency(),
    smtpTransport: transport,
  });

  const result = await service.send({
    ...MESSAGE,
    attachments: [
      {
        content: new Uint8Array([37, 80, 68, 70]),
        contentType: "application/pdf",
        filename: "signed.pdf",
      },
    ],
  });
  const batch = await service.sendBatch([
    MESSAGE,
    { ...MESSAGE, to: "b@example.test" },
  ]);

  assert.deepEqual(result, {
    accepted: [MESSAGE.to],
    messageId: "<1@example.test>",
    rejected: [],
  });
  assert.equal(sent[0]?.from, "Example <hello@example.test>");
  assert.equal(sent[0]?.replyTo, "help@example.test");
  assert.equal(sent[0]?.subject, MESSAGE.subject);
  assert.equal(
    (sent[0]?.attachments as { filename: string }[])[0]?.filename,
    "signed.pdf",
  );
  assert.deepEqual(
    batch.map((item) => item.accepted[0]),
    [MESSAGE.to, "b@example.test"],
  );
});

/** An idempotency store kept in memory, standing in for the database table. */
function memoryIdempotency(): SmtpIdempotencyStore & {
  keys: Map<string, "sending" | "sent">;
} {
  const keys = new Map<string, "sending" | "sent">();

  return {
    claim: async (key) => {
      const state = keys.get(key);

      if (state === "sent") {
        return "sent";
      }

      if (state === "sending") {
        return "in_flight";
      }

      keys.set(key, "sending");
      return "claimed";
    },
    complete: async (key) => {
      keys.set(key, "sent");
    },
    keys,
    release: async (key) => {
      keys.delete(key);
    },
  };
}

test("an SMTP send with an idempotency key already used is not sent again", async () => {
  let sends = 0;
  let failNext = false;
  const transport = {
    sendMail: (async () => {
      if (failNext) {
        failNext = false;
        throw new Error("connection reset");
      }

      sends += 1;
      return {
        accepted: [MESSAGE.to],
        messageId: "<x@example.test>",
        rejected: [],
      };
    }) as unknown as SmtpTransport["sendMail"],
  };
  const idempotency = memoryIdempotency();
  const service = createEmailService({
    resolveAddresses: async () => ({
      senderAddress: "hello@example.test",
      supportAddress: null,
    }),
    smtpIdempotency: idempotency,
    smtpTransport: transport,
  });

  await service.send(MESSAGE, { idempotencyKey: "expiry-notice/1" });
  const again = await service.send(MESSAGE, {
    idempotencyKey: "expiry-notice/1",
  });

  assert.equal(sends, 1);
  assert.deepEqual(again, { accepted: [MESSAGE.to], rejected: [] });

  // A send that fails gives its key back, so the retry goes out.
  failNext = true;
  await assert.rejects(
    service.send(MESSAGE, { idempotencyKey: "expiry-notice/2" }),
    /connection reset/,
  );
  await service.send(MESSAGE, { idempotencyKey: "expiry-notice/2" });
  assert.equal(sends, 2);

  // Without a key, every send goes out.
  await service.send(MESSAGE);
  await service.send(MESSAGE);
  assert.equal(sends, 4);

  // A batch key covers each message of the batch separately.
  await service.sendBatch([MESSAGE, MESSAGE], { idempotencyKey: "batch/1" });
  await service.sendBatch([MESSAGE, MESSAGE], { idempotencyKey: "batch/1" });
  assert.equal(sends, 6);
  assert.ok(
    idempotency.keys.has("batch/1/0") && idempotency.keys.has("batch/1/1"),
  );
});
