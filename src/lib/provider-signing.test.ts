import assert from "node:assert/strict";
import test from "node:test";

import type { DbPool } from "./db/connection.ts";
import {
  completedProviderReturnRedirectPath,
  ProviderSigningError,
  resumeProviderSigning,
} from "./provider-signing.ts";
import { encryptPrivateKey, secretKeyFor } from "./services/seal-identity.ts";
import type { StorageService } from "./services/storage.ts";

const TEST_ENV = {
  APP_URL: "https://sign.example.test",
  AUTH_SECRET: "test-auth-secret-for-provider-signing-unit-tests-0123456789",
};

function createUnusedStorage(): StorageService {
  const fail = (method: string) => () => {
    throw new Error(`storageService.${method} must not be called`);
  };

  return {
    deleteObject: fail("deleteObject"),
    getObject: fail("getObject"),
    getObjectStream: fail("getObjectStream"),
    headObject: fail("headObject"),
    putObject: fail("putObject"),
  };
}

function sealTestSecret(token: string): string {
  return encryptPrivateKey(
    JSON.stringify({
      providerData: { docId: "doc-123" },
      submission: { clientTimezoneOffsetMinutes: 0, fields: [] },
      token,
    }),
    secretKeyFor("signudoc/provider-session/v1", TEST_ENV),
  );
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    baseSha256: null,
    contentDigest: "a".repeat(64),
    envelopeId: "env-1",
    envelopeStatus: "completed",
    envelopeTitle: "Provider return agreement",
    expiresAt: Math.floor(Date.now() / 1000) + 1800,
    id: "session-completed-1",
    level: "qualified",
    provider: "eideasy",
    revisionKey: "revisions/env-1/session-completed-1.pdf",
    secretData: "",
    signerName: "Quinn Qualified",
    state: "completed",
    submittedAt: Math.floor(Date.now() / 1000) - 60,
    ...overrides,
  };
}

test("revisiting a completed provider session with cleared secrets confirms completion without side effects", async () => {
  for (const [provider, envelopeStatus] of [
    ["eideasy", "completed"],
    ["csc", "sent"],
  ] as const) {
    const queries: string[] = [];
    const database = {
      query: async (sql: string) => {
        queries.push(sql.replace(/\s+/g, " ").trim());
        return {
          rowCount: 1,
          rows: [
            makeSessionRow({
              envelopeStatus,
              provider,
              secretData: "",
              state: "completed",
            }),
          ],
        };
      },
    } as unknown as DbPool;

    let verifiedMethodsCalled = false;

    for (let visit = 0; visit < 3; visit += 1) {
      const result = await resumeProviderSigning(
        "session-completed-1",
        new URLSearchParams("state=session-completed-1&code=spent-code"),
        {
          database,
          env: TEST_ENV,
          storageService: createUnusedStorage(),
          verifiedMethodsFor: () => {
            verifiedMethodsCalled = true;
            return [];
          },
        },
      );

      assert.deepEqual(result, {
        redirectPath: "/sign/completed/done?title=Provider+return+agreement",
      });
    }

    assert.equal(verifiedMethodsCalled, false);
    assert.equal(queries.length, 3);
    assert.ok(queries.every((sql) => sql.startsWith("SELECT ")));
  }
});

test("revisiting a completed provider session after voiding or declining reflects the envelope status", async () => {
  for (const envelopeStatus of ["voided", "declined"] as const) {
    const database = {
      query: async () => ({
        rowCount: 1,
        rows: [
          makeSessionRow({
            envelopeStatus,
            envelopeTitle: "Confidential Agreement",
            secretData: "",
            state: "completed",
          }),
        ],
      }),
    } as unknown as DbPool;

    const result = await resumeProviderSigning(
      "session-completed-1",
      new URLSearchParams("state=session-completed-1"),
      {
        database,
        env: TEST_ENV,
        storageService: createUnusedStorage(),
        verifiedMethodsFor: () => [],
      },
    );

    assert.deepEqual(result, {
      redirectPath: `/sign/completed/done?status=${envelopeStatus}`,
    });
  }
});

test("losing the claim race to a return that just completed redirects to the done page", async () => {
  const queries: string[] = [];
  const database = {
    query: async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      queries.push(normalized);

      if (queries.length === 1) {
        return {
          rowCount: 1,
          rows: [
            makeSessionRow({
              envelopeStatus: "sent",
              secretData: sealTestSecret("signer-token-race"),
              state: "pending",
            }),
          ],
        };
      }

      if (normalized.startsWith("UPDATE provider_signing_sessions")) {
        return { rowCount: 0, rows: [] };
      }

      return {
        rowCount: 1,
        rows: [
          {
            envelopeStatus: "completed",
            envelopeTitle: "Provider return agreement",
            state: "completed",
          },
        ],
      };
    },
  } as unknown as DbPool;

  const result = await resumeProviderSigning(
    "session-race-1",
    new URLSearchParams("state=session-race-1"),
    {
      database,
      env: TEST_ENV,
      storageService: createUnusedStorage(),
      verifiedMethodsFor: () => [],
    },
  );

  assert.deepEqual(result, {
    redirectPath: "/sign/completed/done?title=Provider+return+agreement",
  });
  assert.equal(queries.length, 3);
});

test("losing the claim race while another return is still signing rejects with expired and keeps the token", async () => {
  let step = 0;
  const database = {
    query: async (sql: string) => {
      step += 1;

      if (step === 1) {
        return {
          rowCount: 1,
          rows: [
            makeSessionRow({
              envelopeStatus: "sent",
              secretData: sealTestSecret("signer-token-inflight"),
              state: "pending",
            }),
          ],
        };
      }

      if (sql.includes("UPDATE provider_signing_sessions")) {
        return { rowCount: 0, rows: [] };
      }

      return {
        rowCount: 1,
        rows: [
          {
            envelopeStatus: "sent",
            envelopeTitle: "Provider return agreement",
            state: "signing",
          },
        ],
      };
    },
  } as unknown as DbPool;

  await assert.rejects(
    resumeProviderSigning(
      "session-inflight-1",
      new URLSearchParams("state=session-inflight-1"),
      {
        database,
        env: TEST_ENV,
        storageService: createUnusedStorage(),
        verifiedMethodsFor: () => [],
      },
    ),
    (error: unknown) =>
      error instanceof ProviderSigningError &&
      error.problem === "expired" &&
      error.token === "signer-token-inflight",
  );
});

test("unknown states and failed sessions reject without a token or envelope details", async () => {
  const unknownDb = {
    query: async () => ({ rowCount: 0, rows: [] }),
  } as unknown as DbPool;

  await assert.rejects(
    resumeProviderSigning(
      "unknown-session",
      new URLSearchParams("state=unknown-session"),
      {
        database: unknownDb,
        env: TEST_ENV,
        storageService: createUnusedStorage(),
        verifiedMethodsFor: () => [],
      },
    ),
    (error: unknown) =>
      error instanceof ProviderSigningError &&
      error.problem === "expired" &&
      error.token === null,
  );

  const failedDb = {
    query: async () => ({
      rowCount: 1,
      rows: [
        makeSessionRow({
          envelopeTitle: "Top Secret Merger",
          secretData: "",
          state: "failed",
        }),
      ],
    }),
  } as unknown as DbPool;

  await assert.rejects(
    resumeProviderSigning(
      "failed-session",
      new URLSearchParams("state=failed-session"),
      {
        database: failedDb,
        env: TEST_ENV,
        storageService: createUnusedStorage(),
        verifiedMethodsFor: () => [],
      },
    ),
    (error: unknown) =>
      error instanceof ProviderSigningError &&
      error.problem === "expired" &&
      error.token === null &&
      !error.message.includes("Top Secret Merger"),
  );
});

test("completedProviderReturnRedirectPath encodes special characters in titles", () => {
  assert.equal(
    completedProviderReturnRedirectPath({
      envelopeStatus: "completed",
      envelopeTitle: 'Q&A "Agreement" #1',
    }),
    "/sign/completed/done?title=Q%26A+%22Agreement%22+%231",
  );
});
