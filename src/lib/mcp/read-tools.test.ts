import assert from "node:assert/strict";
import { test } from "node:test";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";

import type { ApiContext } from "../api/route.ts";
import type { ApiEnvelope } from "../api/envelopes.ts";
import { createReadToolHandlers, registerReadTools } from "./read-tools.ts";

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
const ENVELOPE_ID = "00000000-0000-4000-8000-000000000001";

function envelope(id = ENVELOPE_ID): ApiEnvelope {
  return {
    completedAt: null,
    copyRecipients: [],
    createdAt: "2026-11-23T00:00:00.000Z",
    declinedAt: null,
    delivery: "email",
    expired: false,
    expiresAt: null,
    files: { certificate: null, signed: null },
    id,
    metadata: null,
    object: "envelope",
    pageCount: 2,
    sentAt: "2026-11-23T00:00:00.000Z",
    signatureLevel: "simple",
    signers: [
      {
        declinedAt: null,
        declineReason: null,
        email: "approver@example.test",
        id: "recipient-1",
        name: "Approver",
        order: 1,
        ref: "approver",
        role: "approver",
        signedAt: null,
        status: "pending",
        step: 1,
        viewedAt: null,
      },
      {
        declinedAt: null,
        declineReason: null,
        email: "signer@example.test",
        id: "recipient-2",
        name: "Signer",
        order: 2,
        ref: "signer",
        role: "signer",
        signedAt: "2026-11-23T00:01:00.000Z",
        status: "signed",
        step: 2,
        viewedAt: null,
      },
    ],
    status: "sent",
    title: "Service agreement",
    voidedAt: null,
  };
}

function fakeDependencies(overrides: Record<string, unknown> = {}) {
  const access: unknown[] = [];
  const data = [envelope()];
  const bytes = new Uint8Array([37, 80, 68, 70]);
  return {
    access,
    createStorageService: () => ({
      deleteObject: async () => undefined,
      getObject: async () => ({
        bucketName: "private",
        body: bytes,
        key: "secret/storage/key",
      }),
      getObjectStream: async () => ({
        bucketName: "private",
        key: "private",
        stream: new ReadableStream(),
      }),
      headObject: async () => ({
        bucketName: "private",
        exists: true,
        key: "private",
      }),
      putObject: async () => ({ bucketName: "private", key: "private" }),
    }),
    getApiEnvelope: async (
      _userId: string,
      id: string,
      _database: unknown,
      filter?: unknown,
    ) => {
      access.push(filter);
      return id === ENVELOPE_ID ? data[0] : null;
    },
    getDatabase: () =>
      ({}) as ReturnType<typeof import("../db/connection.ts").getDb>,
    getSenderEnvelopeDownload: async (
      _userId: string,
      id: string,
      file: unknown,
    ) => ({
      body: bytes,
      contentLength: bytes.byteLength,
      contentType: "application/pdf",
      envelopeId: id,
      fileName:
        file === "signed"
          ? "agreement-signed.pdf"
          : "agreement-certificate.pdf",
      fileType: file === "signed" ? ("signed" as const) : ("evidence" as const),
      key: "secret/storage/key",
    }),
    listApiEnvelopeEvents: async (
      _userId: string,
      id: string,
      _database: unknown,
      filter?: unknown,
    ) => {
      access.push(filter);
      return id === ENVELOPE_ID
        ? [
            {
              actor: { email: null, type: "system" },
              at: "2026-11-23T00:00:00.000Z",
              event: "created",
              id: "event-1",
              ipAddress: null,
              metadata: null,
            },
            {
              actor: { email: "signer@example.test", type: "signer" },
              at: "2026-11-23T00:01:00.000Z",
              event: "signed",
              id: "event-2",
              ipAddress: "192.0.2.1",
              metadata: { signerId: "recipient-2" },
            },
          ]
        : null;
    },
    listApiEnvelopes: async (
      _userId: string,
      query: unknown,
      _database: unknown,
      filter?: unknown,
    ) => {
      access.push({ query, filter });
      return { data, nextCursor: "next-page" };
    },
    ...overrides,
  };
}

test("list applies cursor and status and returns documented signer and approver progress", async () => {
  const dependencies = fakeDependencies();
  const handlers = createReadToolHandlers(context, dependencies);
  const result = await handlers.listEnvelopes({
    limit: 10,
    status: "sent",
    cursor: "cursor-1",
  });

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.nextCursor, "next-page");
  const envelopeResult = (result.structuredContent?.data as ApiEnvelope[])[0]!;
  assert.deepEqual(
    envelopeResult.signers.map(({ role, status }) => ({ role, status })),
    [
      { role: "approver", status: "pending" },
      { role: "signer", status: "signed" },
    ],
  );
  assert.deepEqual(dependencies.access[0], {
    query: { limit: 10, status: "sent", cursor: "cursor-1" },
    filter: { apiKeyId: "prepare-key-1" },
  });
});

test("get and events are key-filtered, and audit events retain oldest-first order", async () => {
  const dependencies = fakeDependencies();
  const handlers = createReadToolHandlers(context, dependencies);
  const found = await handlers.getEnvelope({ envelopeId: ENVELOPE_ID });
  const events = await handlers.listEnvelopeEvents({ envelopeId: ENVELOPE_ID });
  const missing = await handlers.getEnvelope({
    envelopeId: "00000000-0000-4000-8000-000000000002",
  });

  assert.equal(
    (found.structuredContent?.envelope as ApiEnvelope).id,
    ENVELOPE_ID,
  );
  assert.deepEqual(
    (events.structuredContent?.events as Array<{ event: string }>).map(
      ({ event }) => event,
    ),
    ["created", "signed"],
  );
  assert.equal(missing.isError, true);
  assert.deepEqual(dependencies.access, [
    { apiKeyId: "prepare-key-1" },
    { apiKeyId: "prepare-key-1" },
    { apiKeyId: "prepare-key-1" },
  ]);
});

test("file tool embeds both PDF file kinds with bytes, MIME type, and filename", async () => {
  const handlers = createReadToolHandlers(context, fakeDependencies());

  for (const file of ["signed", "certificate"] as const) {
    const result = await handlers.downloadEnvelopeFile({
      envelopeId: ENVELOPE_ID,
      file,
    });
    const resource = result.content.find((item) => item.type === "resource");

    assert.equal(result.isError, undefined);
    assert.equal(
      result.structuredContent?.fileName,
      file === "signed" ? "agreement-signed.pdf" : "agreement-certificate.pdf",
    );
    assert.equal(result.structuredContent?.mimeType, "application/pdf");
    assert.equal("key" in (result.structuredContent ?? {}), false);
    assert.equal(resource?.type, "resource");
    if (resource?.type === "resource" && "blob" in resource.resource) {
      assert.equal(resource.resource.mimeType, "application/pdf");
      assert.equal(
        Buffer.from(resource.resource.blob, "base64").toString(),
        "%PDF",
      );
      assert.match(
        resource.resource.uri,
        /agreement-(signed|certificate)\.pdf$/,
      );
      assert.equal(resource.resource.uri.includes("secret/storage/key"), false);
    } else {
      assert.fail("expected embedded binary resource");
    }
  }
});

test("unfinished files return not-ready and invalid file values are rejected", async () => {
  const handlers = createReadToolHandlers(
    context,
    fakeDependencies({
      getSenderEnvelopeDownload: async () => {
        const error = new Error(
          "Signed PDF downloads are available only for completed envelopes.",
        ) as Error & { statusCode: number };
        error.statusCode = 409;
        throw error;
      },
    }),
  );
  const notReady = await handlers.downloadEnvelopeFile({
    envelopeId: ENVELOPE_ID,
    file: "signed",
  });
  const invalid = await handlers.downloadEnvelopeFile({
    envelopeId: ENVELOPE_ID,
    file: "source",
  });

  assert.equal(notReady.isError, undefined);
  assert.equal(notReady.structuredContent?.available, false);
  const message = notReady.content.find((item) => item.type === "text");
  assert.match(
    message?.type === "text" ? message.text : "",
    /not available yet/i,
  );
  assert.equal(invalid.isError, true);
});

test("read tools are available from the MCP server", async () => {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerReadTools(server, context, fakeDependencies());
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "read-tool-test", version: "1.0.0" });

  try {
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    assert.deepEqual(
      (await client.listTools()).tools.map(({ name }) => name).sort(),
      [
        "download_envelope_file",
        "get_envelope",
        "list_envelope_events",
        "list_envelopes",
      ],
    );
  } finally {
    await client.close();
  }
});
