import assert from "node:assert/strict";
import { test } from "node:test";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";

import type { ApiContext } from "../api/route.ts";
import type { ApiEnvelope } from "../api/envelopes.ts";
import {
  createDraftToolHandlers,
  decodeInlinePdf,
  MAX_INLINE_PDF_BYTES,
  registerDraftTools,
} from "./draft-tools.ts";

const context: ApiContext = {
  actor: {
    apiKeyId: "prepare-key-1",
    email: "owner@example.test",
    ipAddress: null,
    name: "Owner",
    scope: "prepare",
    userAgent: null,
    userId: "user-1",
  },
  rateLimit: { limit: 600, remaining: 599, resetSeconds: 60 },
  request: new Request("https://sign.example.test/api/mcp"),
};

function draftInput(overrides: Record<string, unknown> = {}) {
  return {
    copyRecipients: [{ email: "copy@example.test", name: "Copy" }],
    fields: [
      {
        height: 0.05,
        page: 1,
        signer: "client",
        type: "signature",
        width: 0.3,
        x: 0.1,
        y: 0.8,
      },
    ],
    filename: "agreement.pdf",
    idempotencyKey: "agent-request-123",
    pdfBase64: Buffer.from("%PDF-1.4\nfixture").toString("base64"),
    signers: [{ email: "signer@example.test", name: "Signer", ref: "client" }],
    title: "Service agreement",
    ...overrides,
  };
}

function fixtureEnvelope(): ApiEnvelope {
  return {
    completedAt: null,
    copyRecipients: [
      { email: "copy@example.test", id: "copy-1", name: "Copy" },
    ],
    createdAt: "2026-11-23T00:00:00.000Z",
    declinedAt: null,
    delivery: "email",
    expired: false,
    expiresAt: null,
    files: { certificate: null, signed: null },
    id: "envelope-1",
    metadata: null,
    object: "envelope",
    pageCount: 1,
    sentAt: null,
    signatureLevel: "simple",
    signers: [
      {
        declinedAt: null,
        declineReason: null,
        email: "signer@example.test",
        id: "signer-1",
        name: "Signer",
        order: 1,
        ref: "client",
        role: "signer",
        signedAt: null,
        status: "pending",
        step: 1,
        viewedAt: null,
      },
    ],
    status: "draft",
    title: "Service agreement",
    voidedAt: null,
  };
}

function fakeDependencies(overrides: Record<string, unknown> = {}) {
  const envelope = fixtureEnvelope();
  const pending = new Map<string, Uint8Array>();
  const created: unknown[] = [];
  const completed = new Map<string, { body: unknown; status: number }>();

  return {
    applyUploadLimit: async () => null,
    completed,
    createEnvelopeForApi: async (
      _actor: unknown,
      input: unknown,
      sourcePdf: unknown,
      _database: unknown,
      options?: { onCreated?: (id: string) => Promise<void> },
    ) => {
      created.push({ input, sourcePdf });
      await options?.onCreated?.(envelope.id);
      return envelope;
    },
    created,
    createStorageService: () => ({
      deleteObject: async () => undefined,
      getObject: async () => ({
        bucketName: "test",
        body: new Uint8Array(),
        key: "test",
      }),
      getObjectStream: async () => ({
        bucketName: "test",
        key: "test",
        stream: new ReadableStream(),
      }),
      headObject: async () => ({
        bucketName: "test",
        exists: false,
        key: "test",
      }),
      putObject: async () => ({ bucketName: "test", key: "test" }),
    }),
    discardPendingUpload: async ({ key }: { key: string }) => {
      pending.delete(
        key
          .split("/")
          .at(-1)!
          .replace(/\.pdf$/, ""),
      );
    },
    getDatabase: () =>
      ({}) as ReturnType<typeof import("../db/connection.ts").getDb>,
    getApiEnvelope: async () => envelope,
    issueApiUpload: async () => ({
      expiresAt: "2026-11-23T00:10:00.000Z",
      headers: { "content-type": "application/pdf" },
      maxBytes: 20 * 1024 * 1024,
      method: "PUT" as const,
      uploadId: "upload-1",
      url: "https://blob.example.test/upload-once",
    }),
    pending,
    readPendingUpload: async ({ key }: { key: string }) => {
      const uploadId = key
        .split("/")
        .at(-1)!
        .replace(/\.pdf$/, "");
      const bytes = pending.get(uploadId);

      if (!bytes) {
        throw new Error("missing upload");
      }

      return bytes;
    },
    resolveAppUrl: () => "https://sign.example.test",
    runIdempotently: async (
      idempotentContext: ApiContext,
      _route: string,
      body: string,
      run: (remember: (id: string) => Promise<void>) => Promise<{
        body: unknown;
        status: number;
      }>,
    ) => {
      const key = `${idempotentContext.actor.apiKeyId}:${idempotentContext.request.headers.get("idempotency-key")}`;
      const previous = completed.get(key);

      if (previous) {
        return Response.json(previous.body, { status: previous.status });
      }

      let resourceId: string | null = null;
      const result = await run(async (id) => {
        resourceId = id;
      });

      if (resourceId) {
        completed.set(key, result);
      }

      return Response.json(result.body, { status: result.status });
    },
    supportsDirectUploads: () => true,
    ...overrides,
  };
}

test("inline PDFs are strictly decoded and capped at 3 MiB", () => {
  const small = Buffer.from("%PDF-1.4\nfixture").toString("base64");

  assert.equal(decodeInlinePdf(small).byteLength, 16);
  assert.throws(() => decodeInlinePdf("not base64!"), /base64/i);
  assert.throws(
    () =>
      decodeInlinePdf(
        Buffer.alloc(MAX_INLINE_PDF_BYTES + 1, 1).toString("base64"),
      ),
    /3 MiB/i,
  );
});

test("upload target tool returns the current API upload contract", async () => {
  const handlers = createDraftToolHandlers(context, fakeDependencies());
  const result = await handlers.requestPdfUpload();

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.uploadId, "upload-1");
  assert.equal(result.structuredContent?.method, "PUT");
});

test("local storage refuses direct upload targets with a clear error", async () => {
  const handlers = createDraftToolHandlers(
    context,
    fakeDependencies({ supportsDirectUploads: () => false }),
  );
  const result = await handlers.requestPdfUpload();

  assert.equal(result.isError, true);
  assert.match(result.content[0]?.text ?? "", /direct upload.*supported/i);
});

test("draft creation refuses send, missing files, and invalid signer field references", async () => {
  const handlers = createDraftToolHandlers(context, fakeDependencies());

  const send = await handlers.createEnvelopeDraft(
    draftInput({ send: { permittedUseConfirmed: true } }),
  );
  const missingFile = await handlers.createEnvelopeDraft(
    draftInput({
      uploadId: "00000000-0000-4000-8000-000000000001",
      pdfBase64: undefined,
    }),
  );
  const invalidRef = await handlers.createEnvelopeDraft(
    draftInput({ fields: [{ ...draftInput().fields[0], signer: "unknown" }] }),
  );

  assert.equal(send.isError, true);
  assert.equal(missingFile.isError, true);
  assert.equal(invalidRef.isError, true);
});

test("same idempotency key replays the draft and a pending upload cannot be reused", async () => {
  const dependencies = fakeDependencies();
  const handlers = createDraftToolHandlers(context, dependencies);
  const first = await handlers.createEnvelopeDraft(draftInput());
  const replay = await handlers.createEnvelopeDraft(draftInput());

  assert.equal(first.isError, undefined);
  assert.deepEqual(replay.structuredContent, first.structuredContent);
  assert.equal(dependencies.created.length, 1);

  const uploadId = "00000000-0000-4000-8000-000000000001";
  dependencies.pending.set(uploadId, Buffer.from("%PDF-1.4\nfixture"));
  const uploaded = await handlers.createEnvelopeDraft(
    draftInput({
      idempotencyKey: "upload-request-1",
      pdfBase64: undefined,
      uploadId,
    }),
  );
  const uploadedReplay = await handlers.createEnvelopeDraft(
    draftInput({
      idempotencyKey: "upload-request-1",
      pdfBase64: undefined,
      uploadId,
    }),
  );
  const reused = await handlers.createEnvelopeDraft(
    draftInput({
      idempotencyKey: "upload-request-2",
      pdfBase64: undefined,
      uploadId,
    }),
  );

  assert.equal(uploaded.isError, undefined);
  assert.deepEqual(
    uploadedReplay.structuredContent,
    uploaded.structuredContent,
  );
  assert.equal(reused.isError, true);
  assert.equal(dependencies.created.length, 2);
});

test("draft tools are registered on the MCP server", async () => {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerDraftTools(server, context, fakeDependencies());
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "draft-tool-test", version: "1.0.0" });

  try {
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    assert.deepEqual(
      (await client.listTools()).tools.map(({ name }) => name).sort(),
      ["create_envelope_draft", "request_pdf_upload"],
    );
  } finally {
    await client.close();
  }
});
