import assert from "node:assert/strict";
import { test } from "node:test";

import { auditEventRecordSchema } from "../schemas/envelope.ts";
import {
  getClientIpAddress,
  getClientIpHeaderNames,
  getRequestUserAgent,
} from "./request.ts";

const onVercel = { VERCEL: "1" };
const elsewhere = {};
const threeAddresses = "198.51.100.7, 203.0.113.9, 192.0.2.4";

test("on Vercel, the address Vercel wrote wins over one the visitor could have sent", () => {
  const headers = new Headers({
    "cf-connecting-ip": "198.51.100.9",
    "x-forwarded-for": "198.51.100.7",
    "x-real-ip": "203.0.113.5",
    "x-vercel-forwarded-for": "203.0.113.5",
  });

  assert.equal(getClientIpAddress(headers, onVercel), "203.0.113.5");
  assert.equal(
    getClientIpAddress(
      new Headers({
        "x-forwarded-for": "198.51.100.7",
        "x-real-ip": "203.0.113.5",
      }),
      onVercel,
    ),
    "203.0.113.5",
  );
});

test("off Vercel, Vercel's header means nothing and the proxy headers are used", () => {
  const headers = new Headers({
    // The visitor could have written the first two; the last is the one the
    // nearest proxy added, which the default count trusts.
    "x-forwarded-for": threeAddresses,
    "x-vercel-forwarded-for": "203.0.113.5",
  });

  assert.equal(getClientIpAddress(headers, elsewhere), "192.0.2.4");
  assert.equal(
    getClientIpAddress(
      new Headers({ "cf-connecting-ip": "198.51.100.9" }),
      elsewhere,
    ),
    "198.51.100.9",
  );
  assert.equal(
    getClientIpHeaderNames(elsewhere).includes("x-vercel-forwarded-for"),
    false,
  );
});

test("off Vercel, TRUSTED_PROXY_HOPS steps past the addresses our proxies wrote for each other", () => {
  const headers = new Headers({ "x-forwarded-for": threeAddresses });

  assert.equal(
    getClientIpAddress(headers, { ...elsewhere, TRUSTED_PROXY_HOPS: "1" }),
    "203.0.113.9",
  );
  assert.equal(
    getClientIpAddress(headers, { ...elsewhere, TRUSTED_PROXY_HOPS: "2" }),
    "198.51.100.7",
  );
});

test("off Vercel, more hops configured than the header shows gives no address", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.7",
    "x-real-ip": "198.51.100.7",
  });

  assert.equal(
    getClientIpAddress(headers, { ...elsewhere, TRUSTED_PROXY_HOPS: "2" }),
    null,
  );
});

test("on Vercel, TRUSTED_PROXY_HOPS changes nothing", () => {
  const headers = new Headers({
    "x-forwarded-for": threeAddresses,
    "x-real-ip": "203.0.113.5",
  });

  assert.equal(
    getClientIpAddress(headers, { ...onVercel, TRUSTED_PROXY_HOPS: "2" }),
    "203.0.113.5",
  );
});

test("an unreadable TRUSTED_PROXY_HOPS counts as 0 and says so once", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const headers = new Headers({ "x-forwarded-for": threeAddresses });

  try {
    assert.equal(
      getClientIpAddress(headers, { ...elsewhere, TRUSTED_PROXY_HOPS: "many" }),
      "192.0.2.4",
    );
    assert.equal(
      getClientIpAddress(headers, { ...elsewhere, TRUSTED_PROXY_HOPS: "-1" }),
      "192.0.2.4",
    );
  } finally {
    warn.mock.restore();
  }

  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0]?.arguments[0]), /TRUSTED_PROXY_HOPS/);
});

test("an empty header is passed over, and no header at all gives no address", () => {
  assert.equal(
    getClientIpAddress(
      new Headers({ "x-forwarded-for": " ", "x-real-ip": "203.0.113.5" }),
      elsewhere,
    ),
    "203.0.113.5",
  );
  assert.equal(getClientIpAddress(new Headers(), onVercel), null);
});

test("a user agent header with no value counts as no user agent", () => {
  assert.equal(getRequestUserAgent(new Headers()), null);
  assert.equal(getRequestUserAgent(new Headers({ "user-agent": "" })), null);
  assert.equal(getRequestUserAgent(new Headers({ "user-agent": "  " })), null);
  assert.equal(
    getRequestUserAgent(new Headers({ "user-agent": " curl/8.5.0 " })),
    "curl/8.5.0",
  );
});

test("the audit schema accepts what an empty user agent header gives", () => {
  const userAgent = getRequestUserAgent(new Headers({ "user-agent": "" }));

  assert.ok(
    auditEventRecordSchema.shape.userAgent.safeParse(userAgent).success,
  );
});
