import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  assertWebhookUrlAllowed,
  buildWebhookPayload,
  hostnameForNetwork,
  isBlockedWebhookAddress,
  lookupPinnedAddresses,
  serializeWebhookPayload,
  signWebhookBody,
  webhookRequestTarget,
  webhookRetryDelaySeconds,
  webhookSignatureMatches,
  WebhooksError,
} from "./webhooks.ts";

const publicLookup = async () => [{ address: "8.8.8.8" }];

test("signWebhookBody is HMAC-SHA256 of timestamp.body, as v1 hex", () => {
  const rawBody = '{"id":"evt_1"}';
  const timestamp = 1_700_000_000;
  const secret = "s".repeat(64);
  const digest = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${rawBody}`)
    .digest("hex");

  assert.equal(signWebhookBody(secret, timestamp, rawBody), `v1=${digest}`);
  assert.equal(
    webhookSignatureMatches(secret, timestamp, rawBody, `v1=${digest}`),
    true,
  );
  assert.equal(
    webhookSignatureMatches(secret, timestamp, rawBody, `v1=${"0".repeat(64)}`),
    false,
  );
});

test("buildWebhookPayload includes the envelope summary and no secrets", () => {
  const payload = buildWebhookPayload({
    envelope: {
      id: "env-1",
      senderEmail: "sam@example.test",
      signerCount: 2,
      status: "completed",
      title: "Lease",
      url: "https://sign.example.test/envelopes/env-1",
    },
    eventId: "evt-1",
    eventType: "envelope.completed",
    occurredAt: 1_700_000_000,
  });
  const raw = serializeWebhookPayload(payload);
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  assert.equal(payload.id, "evt-1");
  assert.equal(payload.type, "envelope.completed");
  assert.equal(payload.occurredAt, "2023-11-14T22:13:20.000Z");
  assert.equal(payload.envelope.signerCount, 2);
  assert.equal(payload.test, undefined);
  assert.equal("secret" in parsed, false);
  assert.equal("accessCode" in parsed, false);
  assert.deepEqual(Object.keys(parsed), [
    "id",
    "type",
    "occurredAt",
    "envelope",
  ]);
  assert.deepEqual(Object.keys(parsed.envelope as object), [
    "id",
    "title",
    "status",
    "senderEmail",
    "signerCount",
    "url",
  ]);
});

test("a test event marks the payload so receivers can ignore it", () => {
  const payload = buildWebhookPayload({
    envelope: {
      id: "00000000-0000-0000-0000-000000000000",
      senderEmail: "ada@example.test",
      signerCount: 0,
      status: "completed",
      title: "Test event",
      url: "https://sign.example.test/envelopes/00000000-0000-0000-0000-000000000000",
    },
    eventId: "evt-test",
    eventType: "envelope.completed",
    occurredAt: 1_700_000_000,
    test: true,
  });
  const parsed = JSON.parse(serializeWebhookPayload(payload)) as {
    test?: boolean;
  };

  assert.equal(payload.test, true);
  assert.equal(parsed.test, true);
});

test("webhookRetryDelaySeconds doubles each day, capped at eight", () => {
  assert.equal(webhookRetryDelaySeconds(1), 86_400);
  assert.equal(webhookRetryDelaySeconds(2), 172_800);
  assert.equal(webhookRetryDelaySeconds(3), 345_600);
  assert.equal(webhookRetryDelaySeconds(4), 691_200);
  assert.equal(webhookRetryDelaySeconds(5), 691_200);
});

test("loopback, private, link-local and unspecified addresses are blocked", () => {
  assert.equal(isBlockedWebhookAddress("10.0.0.5"), true);
  assert.equal(isBlockedWebhookAddress("127.0.0.1"), true);
  assert.equal(isBlockedWebhookAddress("192.168.1.1"), true);
  assert.equal(isBlockedWebhookAddress("172.16.0.1"), true);
  assert.equal(isBlockedWebhookAddress("169.254.169.254"), true);
  assert.equal(isBlockedWebhookAddress("::1"), true);
  assert.equal(isBlockedWebhookAddress("8.8.8.8"), false);
});

test("IPv6 literals keep brackets in URL.hostname and drop them for checks", () => {
  assert.equal(hostnameForNetwork("[::1]"), "::1");
  assert.equal(hostnameForNetwork("::1"), "::1");
  assert.equal(
    hostnameForNetwork("[2001:4860:4860::8888]"),
    "2001:4860:4860::8888",
  );
});

test("http://[::1] is allowed outside production", async () => {
  const local = await assertWebhookUrlAllowed("http://[::1]/hooks");

  assert.equal(hostnameForNetwork(local.hostname), "::1");
  assert.equal(local.protocol, "http:");
});

test("a public HTTPS IPv6 literal is allowed", async () => {
  const url = await assertWebhookUrlAllowed(
    "https://[2001:4860:4860::8888]/hooks",
  );

  assert.equal(hostnameForNetwork(url.hostname), "2001:4860:4860::8888");
  assert.equal(url.protocol, "https:");
});

test("delivery connects to the checked address and keeps the hostname for TLS", () => {
  const url = new URL("https://hooks.example.test/signudoc");
  const target = webhookRequestTarget(url, ["93.184.216.34"]);

  assert.equal(target.hostname, "hooks.example.test");
  assert.equal(target.hostHeader, "hooks.example.test");
  assert.deepEqual(target.connectAddresses, ["93.184.216.34"]);
});

test("pinned lookup returns the address list when Node asks for all", () => {
  const lookup = lookupPinnedAddresses(["93.184.216.34", "2606:2800::1"]);
  let all: unknown;
  let single: unknown;

  lookup("hooks.example.test", { all: true }, (error, addresses) => {
    assert.equal(error, null);
    all = addresses;
  });
  lookup("hooks.example.test", { family: 6 }, (error, address, family) => {
    assert.equal(error, null);
    single = [address, family];
  });

  assert.deepEqual(all, [
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800::1", family: 6 },
  ]);
  assert.deepEqual(single, ["2606:2800::1", 6]);
});

test("a hostname request connects through the pinned lookup", async () => {
  const server = http.createServer((request, response) => {
    response.statusCode = 204;
    response.end(request.headers.host);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address() as AddressInfo;
    const status = await new Promise<number>((resolve, reject) => {
      const request = http.request(
        {
          hostname: "hooks.example.test",
          lookup: lookupPinnedAddresses(["127.0.0.1"]),
          method: "POST",
          port,
        },
        (response) => {
          response.resume();
          response.on("end", () => resolve(response.statusCode ?? 0));
        },
      );

      request.on("error", reject);
      request.end("{}");
    });

    assert.equal(status, 204);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("IPv6 delivery target strips brackets for the connect hostname", () => {
  const url = new URL("http://[::1]:43721/hooks");
  const target = webhookRequestTarget(url, ["::1"]);

  assert.equal(target.hostname, "::1");
  assert.equal(target.hostHeader, "[::1]:43721");
  assert.deepEqual(target.connectAddresses, ["::1"]);
});

test("http://10.0.0.5 is refused as a private address", async () => {
  await assert.rejects(
    assertWebhookUrlAllowed("http://10.0.0.5/hooks"),
    (error: unknown) =>
      error instanceof WebhooksError &&
      error.statusCode === 400 &&
      error.message === "That address cannot be used as a webhook URL.",
  );
});

test("plain HTTP is refused except localhost when not in production", async () => {
  await assert.rejects(
    assertWebhookUrlAllowed("http://example.com/hooks", {
      lookupAddresses: publicLookup,
    }),
    (error: unknown) =>
      error instanceof WebhooksError &&
      error.message === "Webhook URLs must use HTTPS.",
  );

  const local = await assertWebhookUrlAllowed("http://localhost:43721/hooks");

  assert.equal(local.hostname, "localhost");
  assert.equal(local.protocol, "http:");
});

test("http://localhost is refused in production", async () => {
  await assert.rejects(
    assertWebhookUrlAllowed("http://localhost/hooks", {
      env: { NODE_ENV: "production" },
    }),
    (error: unknown) =>
      error instanceof WebhooksError &&
      error.message ===
        "http://localhost is only allowed while this site is not in production.",
  );
});

test("https://10.0.0.5 is refused as a private address", async () => {
  await assert.rejects(
    assertWebhookUrlAllowed("https://10.0.0.5/hooks"),
    (error: unknown) =>
      error instanceof WebhooksError &&
      error.statusCode === 400 &&
      error.message === "That address cannot be used as a webhook URL.",
  );
});

test("HTTPS URLs that resolve to a public address are allowed", async () => {
  const url = await assertWebhookUrlAllowed(
    "https://hooks.example.test/signudoc",
    {
      lookupAddresses: publicLookup,
    },
  );

  assert.equal(url.hostname, "hooks.example.test");
});

test("metadata hosts and URLs with credentials are refused", async () => {
  await assert.rejects(
    assertWebhookUrlAllowed("https://metadata.google.internal/latest"),
    WebhooksError,
  );
  await assert.rejects(
    assertWebhookUrlAllowed("https://user:pass@example.com/hooks", {
      lookupAddresses: publicLookup,
    }),
    WebhooksError,
  );
  await assert.rejects(
    assertWebhookUrlAllowed("https://169.254.169.254/latest/meta-data"),
    WebhooksError,
  );
});
