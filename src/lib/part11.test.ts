import assert from "node:assert/strict";
import { test } from "node:test";

import { toCsv } from "./audit-export.ts";
import type { DbPool } from "./db/connection.ts";
import {
  checkSigningCredentials,
  describePart11SignerProblem,
  describeSigningCredentialFailure,
  MAX_SIGNING_PASSWORD_ATTEMPTS,
} from "./part11.ts";
import { computeSystemAuditRowHash } from "./services/system-audit.ts";
import {
  buildSignatureManifestation,
  parseSignatureMeaning,
} from "./signature-meanings.ts";
import { requiredSignerChecks } from "./signer-checks.ts";

// Part 11 mode's pure parts: the line printed beside a signature, the CSV
// export, the reasons a send is refused and the install audit hash.

test("the manifestation gives the name, the UTC time and the meaning", () => {
  assert.equal(
    buildSignatureManifestation({
      name: "Ada Lovelace",
      signatureMeaning: "approval",
      signedAt: Date.UTC(2026, 10, 13, 9, 5, 7) / 1000,
    }),
    "Signed by Ada Lovelace | 2026-11-13 09:05:07 UTC | Meaning: Approval",
  );
});

test("only the four Part 11 meanings parse", () => {
  assert.equal(parseSignatureMeaning("review"), "review");
  assert.equal(parseSignatureMeaning("authorship"), "authorship");
  assert.equal(parseSignatureMeaning("Approval"), null);
  assert.equal(parseSignatureMeaning(undefined), null);
});

test("a CSV cell never runs as a spreadsheet formula and quotes are escaped", () => {
  const csv = toCsv([
    ['=HYPERLINK("x")', "+1", "-2", "@cmd", "plain"],
    ['say "hi", then', { a: 1 }, null],
  ]);

  assert.equal(
    csv,
    `"'=HYPERLINK(""x"")",'+1,'-2,'@cmd,plain\r\n"say ""hi"", then","{""a"":1}",\r\n`,
  );
});

test("a send is refused for each missing Part 11 condition, in order", () => {
  const signer = { email: "a@example.test", name: "Ada" };
  const ready = {
    email: "a@example.test",
    emailVerified: true,
    identityVerifiedAt: 1,
    name: "Ada",
    signingLockedAt: null,
    userId: "u1",
  };

  assert.match(
    describePart11SignerProblem(signer, undefined) ?? "",
    /needs an account/,
  );
  assert.match(
    describePart11SignerProblem(signer, { ...ready, emailVerified: false }) ??
      "",
    /not confirmed their email/,
  );
  assert.match(
    describePart11SignerProblem(signer, {
      ...ready,
      identityVerifiedAt: null,
    }) ?? "",
    /confirm Ada's identity/,
  );
  assert.match(
    describePart11SignerProblem(signer, { ...ready, signingLockedAt: 5 }) ?? "",
    /locked for signing/,
  );
  assert.match(
    describePart11SignerProblem(signer, ready) ?? "",
    /Choose what Ada's signature means/,
  );
  assert.equal(
    describePart11SignerProblem(
      { ...signer, signatureMeaning: "approval" },
      ready,
    ),
    null,
  );
});

test("a Part 11 send is refused in a name other than the confirmed person's", () => {
  const account = {
    email: "alice@example.test",
    emailVerified: true,
    identityVerifiedAt: 1,
    name: "Alice B. Holder",
    signingLockedAt: null,
    userId: "u1",
  };
  const signer = {
    email: "alice@example.test",
    signatureMeaning: "approval" as const,
  };

  assert.match(
    describePart11SignerProblem(
      { ...signer, name: "Dr Victim Name" },
      account,
    ) ?? "",
    /confirmed as Alice B\. Holder/,
  );
  // The same person written another way still goes.
  assert.equal(
    describePart11SignerProblem({ ...signer, name: "alice holder" }, account),
    null,
  );
});

test("a signer bound to an account must pass the account check first", () => {
  assert.deepEqual(
    requiredSignerChecks({
      accessCodeHash: null,
      accountUserId: "u1",
      requireEmailCode: true,
    }),
    ["account", "email_code"],
  );
});

test("the install audit hash changes when any field or the previous hash does", () => {
  const fields = {
    actorEmail: "admin@example.test",
    actorUserId: "a1",
    createdAt: 100,
    event: "role_changed" as const,
    id: "e1",
    ipAddress: null,
    metadata: { from: "user", to: "admin" },
    sequence: 1,
    targetUserId: "u1",
    userAgent: null,
  };
  const hash = computeSystemAuditRowHash(null, fields);

  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(computeSystemAuditRowHash(null, { ...fields }), hash);
  assert.notEqual(computeSystemAuditRowHash("x", fields), hash);
  assert.notEqual(
    computeSystemAuditRowHash(null, {
      ...fields,
      metadata: { from: "user", to: "user" },
    }),
    hash,
  );
});

type FakeAccountRow = {
  email: string;
  emailVerified: boolean;
  failedAttempts: number;
  hash: string | null;
  identityVerifiedAt: number | null;
  lockedAt: number | null;
  name: string;
};

function makeFakeAccountPool(row: FakeAccountRow | null): {
  database: DbPool;
  queries: string[];
} {
  const queries: string[] = [];
  const client = {
    async query(sql: string) {
      const normalized = sql.trim();

      queries.push(normalized);

      if (
        normalized === "BEGIN" ||
        normalized === "COMMIT" ||
        normalized === "ROLLBACK"
      ) {
        return { rowCount: 0, rows: [] };
      }

      if (normalized.includes('FROM "user" u')) {
        return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
      }

      return { rowCount: 1, rows: [] };
    },
    release() {},
  };

  return {
    database: {
      async connect() {
        return client;
      },
    } as unknown as DbPool,
    queries,
  };
}

test("checkSigningCredentials distinguishes a previous-name invitation from an unconfirmed account (#231)", async () => {
  const samplePassphrase = "valid-fixture-value-12345";
  let verifierCalls = 0;
  const verifyCredential = async ({
    hash,
    password: value,
  }: {
    hash: string;
    password: string;
  }) => {
    verifierCalls += 1;
    return hash === "stored-check" && value === samplePassphrase;
  };

  // 1. After renaming to Casey Rivera and before an admin confirms the new name,
  //    identityVerifiedAt is null, so the refusal points to identity confirmation.
  const awaitingConfirmation = makeFakeAccountPool({
    email: "casey@example.test",
    emailVerified: true,
    failedAttempts: 0,
    hash: "stored-check",
    identityVerifiedAt: null,
    lockedAt: null,
    name: "Casey Rivera",
  });
  const unconfirmedResult = await checkSigningCredentials(
    {
      email: "casey@example.test",
      password: samplePassphrase,
      signerName: "Casey Morgan",
      userId: "user-casey",
    },
    {
      database: awaitingConfirmation.database,
      verifyPassword: verifyCredential,
    },
  );

  if (unconfirmedResult.ok) {
    assert.fail("expected unconfirmed account to be refused");
  }

  assert.deepEqual(unconfirmedResult, {
    attemptsLeft: MAX_SIGNING_PASSWORD_ATTEMPTS,
    identityNotConfirmed: true,
    locked: false,
    ok: false,
  });
  assert.match(
    describeSigningCredentialFailure(unconfirmedResult),
    /an administrator has to confirm your identity/,
  );

  // 2. Once an admin confirms Casey Rivera, an invitation sent under the old
  //    name Casey Morgan is refused as a signerNameMismatch (not unconfirmed)
  //    and does not count against failed attempts.
  const reconfirmed = makeFakeAccountPool({
    email: "casey@example.test",
    emailVerified: true,
    failedAttempts: 1,
    hash: "stored-check",
    identityVerifiedAt: 1_700_000_000,
    lockedAt: null,
    name: "Casey Rivera",
  });
  const mismatchResult = await checkSigningCredentials(
    {
      email: "casey@example.test",
      password: samplePassphrase,
      signerName: "Casey Morgan",
      userId: "user-casey",
    },
    {
      database: reconfirmed.database,
      verifyPassword: verifyCredential,
    },
  );

  if (mismatchResult.ok) {
    assert.fail("expected previous-name invitation to be refused");
  }

  assert.deepEqual(mismatchResult, {
    attemptsLeft: MAX_SIGNING_PASSWORD_ATTEMPTS - 1,
    locked: false,
    ok: false,
    signerNameMismatch: true,
  });
  assert.equal("identityNotConfirmed" in mismatchResult, false);
  assert.equal(verifierCalls, 0);
  assert.equal(
    reconfirmed.queries.some((sql) => sql.startsWith("UPDATE")),
    false,
  );

  const mismatchMessage = describeSigningCredentialFailure(mismatchResult);

  assert.match(
    mismatchMessage,
    /different name than your account's confirmed name/,
  );
  assert.match(mismatchMessage, /void this envelope with a reason/);
  assert.match(mismatchMessage, /send a new one in your confirmed name/);
  assert.doesNotMatch(
    mismatchMessage,
    /an administrator has to confirm your identity/,
  );
  // Does not disclose the confirmed name on an unauthenticated check.
  assert.doesNotMatch(mismatchMessage, /Casey Rivera/);

  // 3. A replacement invitation sent in the confirmed name passes.
  const replacement = makeFakeAccountPool({
    email: "casey@example.test",
    emailVerified: true,
    failedAttempts: 0,
    hash: "stored-check",
    identityVerifiedAt: 1_700_000_000,
    lockedAt: null,
    name: "Casey Rivera",
  });
  const replacementResult = await checkSigningCredentials(
    {
      email: "casey@example.test",
      password: samplePassphrase,
      signerName: "Casey Rivera",
      userId: "user-casey",
    },
    {
      database: replacement.database,
      verifyPassword: verifyCredential,
    },
  );

  assert.deepEqual(replacementResult, { ok: true });
  assert.equal(verifierCalls, 1);

  // 4. Unverified email and signing lock still take precedence over name mismatch.
  const unverifiedEmail = makeFakeAccountPool({
    email: "casey@example.test",
    emailVerified: false,
    failedAttempts: 0,
    hash: "stored-check",
    identityVerifiedAt: 1_700_000_000,
    lockedAt: null,
    name: "Casey Rivera",
  });

  assert.deepEqual(
    await checkSigningCredentials(
      {
        email: "casey@example.test",
        password: samplePassphrase,
        signerName: "Casey Morgan",
        userId: "user-casey",
      },
      {
        database: unverifiedEmail.database,
        verifyPassword: verifyCredential,
      },
    ),
    {
      attemptsLeft: MAX_SIGNING_PASSWORD_ATTEMPTS,
      identityNotConfirmed: true,
      locked: false,
      ok: false,
    },
  );

  const lockedAccount = makeFakeAccountPool({
    email: "casey@example.test",
    emailVerified: true,
    failedAttempts: MAX_SIGNING_PASSWORD_ATTEMPTS,
    hash: "stored-check",
    identityVerifiedAt: 1_700_000_000,
    lockedAt: 1_700_000_100,
    name: "Casey Rivera",
  });

  assert.deepEqual(
    await checkSigningCredentials(
      {
        email: "casey@example.test",
        password: samplePassphrase,
        signerName: "Casey Morgan",
        userId: "user-casey",
      },
      {
        database: lockedAccount.database,
        verifyPassword: verifyCredential,
      },
    ),
    {
      attemptsLeft: 0,
      locked: true,
      ok: false,
    },
  );
});

test("describeSigningCredentialFailure covers locked and wrong-credential messages", () => {
  assert.match(
    describeSigningCredentialFailure({ attemptsLeft: 0, locked: true }),
    /locked for signing after 5 wrong passwords/,
  );
  assert.match(
    describeSigningCredentialFailure({ attemptsLeft: 1, locked: false }),
    /1 try is left/,
  );
  assert.match(
    describeSigningCredentialFailure({ attemptsLeft: 3, locked: false }),
    /3 tries are left/,
  );
});
