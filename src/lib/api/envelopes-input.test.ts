import assert from "node:assert/strict";
import { test } from "node:test";

import { declineEnvelopeSchema } from "../schemas/signer.ts";
import { apiCreateEnvelopeSchema, describeZodError } from "./envelopes.ts";

const request = {
  fields: [
    {
      height: 0.05,
      page: 1,
      signer: "a",
      type: "signature",
      width: 0.2,
      x: 0.1,
      y: 0.1,
    },
  ],
  signers: [{ email: "a@example.test", name: "Ann", ref: "a" }],
  title: "Lease",
};

test("a NUL character anywhere in an API request is refused as a bad request", () => {
  for (const [input, where] of [
    [{ ...request, title: "Lea\u0000se" }, "title"],
    [{ ...request, metadata: { crm: { id: "a\u0000b" } } }, "metadata.crm.id"],
    [
      { ...request, signers: [{ ...request.signers[0], name: "A\u0000nn" }] },
      "signers.0.name",
    ],
  ] as const) {
    const parsed = apiCreateEnvelopeSchema.safeParse(input);

    assert.equal(parsed.success, false);
    assert.match(
      describeZodError(parsed.error!),
      new RegExp(`^${where}: .*NUL`),
    );
  }
});

test("the text \\u0000, typed out, is not a NUL character", () => {
  assert.equal(
    apiCreateEnvelopeSchema.safeParse({ ...request, title: "a \\u0000 b" })
      .success,
    true,
  );
});

test("a decline reason that is too long says so in plain words", () => {
  const parsed = declineEnvelopeSchema.safeParse({ reason: "x".repeat(1001) });

  assert.equal(parsed.success, false);
  assert.equal(
    parsed.error?.issues[0]?.message,
    "Keep the reason to 1,000 characters or fewer.",
  );
  assert.equal(
    declineEnvelopeSchema.safeParse({ reason: "x".repeat(1000) }).success,
    true,
  );
});
