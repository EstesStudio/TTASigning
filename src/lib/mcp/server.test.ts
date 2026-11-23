import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";

import packageJson from "../../../package.json" with { type: "json" };
import { createSignuDocMcpServer, MCP_SERVER_VERSION } from "./server.ts";
import type { ApiContext } from "../api/route.ts";
import type { ApiEnvelope } from "../api/envelopes.ts";
import { handleMcpRequest } from "./http.ts";
import { registerDraftTools } from "./draft-tools.ts";
import { registerReadTools } from "./read-tools.ts";
import { pendingUploadKeyFor } from "../api/uploads.ts";

const context: ApiContext = {
  actor: {
    apiKeyId: "key-1",
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

test("the MCP factory creates an isolated server for each request", () => {
  const first = createSignuDocMcpServer(context);
  const second = createSignuDocMcpServer(context);

  assert.notEqual(first, second);
});

test("the MCP server reports the installed SignuDoc package version", () => {
  assert.equal(MCP_SERVER_VERSION, packageJson.version);
});

test("authenticated HTTP clients can prepare, inspect, and download without cross-key reads", async () => {
  const appUrl = "https://sign.example.test";
  const envelopeId = "00000000-0000-4000-8000-000000000001";
  const uploadId = "00000000-0000-4000-8000-000000000002";
  const pdf = new Uint8Array(Buffer.from("%PDF-1.4\nfixture"));
  const envelopes = new Map<
    string,
    { apiKeyId: string; envelope: ApiEnvelope }
  >();
  const pendingUploads = new Map<string, Uint8Array>();
  const idempotency = new Map<string, string>();
  const database = {} as ReturnType<typeof import("../db/connection.ts").getDb>;

  const draftDependencies = {
    applyUploadLimit: async () => null,
    createStorageService: () =>
      ({}) as ReturnType<
        typeof import("../services/storage.ts").createStorageService
      >,
    discardPendingUpload: async ({ key }: { key: string }) => {
      pendingUploads.delete(key);
    },
    getDatabase: () => database,
    getApiEnvelope: async (
      userId: string,
      id: string,
      _db: unknown,
      access?: { apiKeyId?: string },
    ) => {
      const record = envelopes.get(id);
      return userId === context.actor.userId &&
        record &&
        (!access?.apiKeyId || record.apiKeyId === access.apiKeyId)
        ? record.envelope
        : null;
    },
    issueApiUpload: async () => ({
      expiresAt: "2026-11-23T00:10:00.000Z",
      headers: { "content-type": "application/pdf" },
      maxBytes: 20 * 1024 * 1024,
      method: "PUT" as const,
      uploadId,
      url: "https://blob.example.test/upload-once",
    }),
    readPendingUpload: async ({ key }: { key: string }) => {
      const bytes = pendingUploads.get(key);
      if (!bytes) throw new Error("missing upload");
      return bytes;
    },
    resolveAppUrl: () => appUrl,
    runIdempotently: async (
      idempotentContext: ApiContext,
      _route: string,
      _body: string,
      run: (
        remember: (resourceId: string) => Promise<void>,
      ) => Promise<{ body: unknown; status: number }>,
      recover: (
        resourceId: string,
      ) => Promise<{ body: unknown; status: number }>,
    ) => {
      const key = `${idempotentContext.actor.apiKeyId}:${idempotentContext.request.headers.get("idempotency-key")}`;
      const priorId = idempotency.get(key);
      if (priorId) {
        const recovered = await recover(priorId);
        return Response.json(recovered.body, { status: recovered.status });
      }
      let createdId: string | null = null;
      const created = await run(async (id) => {
        createdId = id;
      });
      if (createdId) idempotency.set(key, createdId);
      return Response.json(created.body, { status: created.status });
    },
    supportsDirectUploads: () => true,
    createEnvelopeForApi: async (
      actor: { apiKeyId: string },
      input: {
        title: string;
        signers: Array<{
          email: string;
          name: string;
          ref: string;
          step?: number;
        }>;
        copyRecipients?: Array<{ email: string; name: string }>;
      },
      source: { body: Uint8Array },
      _db: unknown,
      options?: { onCreated?: (id: string) => Promise<void> },
    ) => {
      assert.deepEqual(source.body, pdf);
      const created: ApiEnvelope = {
        completedAt: null,
        copyRecipients: (input.copyRecipients ?? []).map(
          (recipient, index) => ({ ...recipient, id: `copy-${index + 1}` }),
        ),
        createdAt: "2026-11-23T00:00:00.000Z",
        declinedAt: null,
        delivery: "email",
        expired: false,
        expiresAt: null,
        files: { certificate: null, signed: null },
        id: envelopeId,
        metadata: null,
        object: "envelope",
        pageCount: 1,
        sentAt: null,
        signatureLevel: "simple",
        signers: input.signers.map((signer, index) => ({
          declinedAt: null,
          declineReason: null,
          email: signer.email,
          id: `signer-${index + 1}`,
          name: signer.name,
          order: index + 1,
          ref: signer.ref,
          role: "signer",
          signedAt: null,
          status: "pending",
          step: signer.step ?? index + 1,
          viewedAt: null,
        })),
        status: "draft",
        title: input.title,
        voidedAt: null,
      };
      envelopes.set(envelopeId, {
        apiKeyId: actor.apiKeyId,
        envelope: created,
      });
      await options?.onCreated?.(envelopeId);
      return created;
    },
  };

  const readDependencies = {
    createStorageService: () => ({
      deleteObject: async () => undefined,
      getObject: async (key: string) => ({
        bucketName: "private",
        body: pdf,
        key,
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
    getDatabase: () => database,
    getApiEnvelope: draftDependencies.getApiEnvelope,
    listApiEnvelopes: async (
      userId: string,
      _query: unknown,
      _db: unknown,
      access?: { apiKeyId?: string },
    ) => ({
      data: [...envelopes.values()]
        .filter(
          (row) =>
            row.apiKeyId === access?.apiKeyId &&
            userId === context.actor.userId,
        )
        .map(({ envelope }) => envelope),
      nextCursor: null,
    }),
    listApiEnvelopeEvents: async (
      userId: string,
      id: string,
      _db: unknown,
      access?: { apiKeyId?: string },
    ) => {
      const record = envelopes.get(id);
      return userId === context.actor.userId &&
        record?.apiKeyId === access?.apiKeyId
        ? [
            {
              actor: { email: null, type: "system" },
              at: "2026-11-23T00:00:00.000Z",
              event: "created",
              id: "event-1",
              ipAddress: null,
              metadata: null,
            },
          ]
        : null;
    },
    getSenderEnvelopeDownload: async (
      _userId: string,
      id: string,
      file: unknown,
    ) => ({
      body: pdf,
      contentLength: pdf.byteLength,
      contentType: "application/pdf",
      envelopeId: id,
      fileName:
        file === "signed"
          ? "agreement-signed.pdf"
          : "agreement-certificate.pdf",
      fileType: file === "signed" ? ("signed" as const) : ("evidence" as const),
      key: "fixture-object",
    }),
  };

  function serverFactory(requestContext: ApiContext) {
    const server = new McpServer(
      { name: "SignuDoc test", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    registerDraftTools(server, requestContext, draftDependencies);
    registerReadTools(server, requestContext, readDependencies);
    return server;
  }

  function makeClient(requestContext: ApiContext) {
    const transport = new StreamableHTTPClientTransport(
      new URL(`${appUrl}/api/mcp`),
      {
        fetch: (url, init) => {
          const headers = new Headers(init?.headers);
          headers.set("authorization", "Bearer sdk_test_prepare_key");
          headers.set("host", "sign.example.test");
          return handleMcpRequest(
            new Request(url, { ...init, headers }),
            requestContext,
            appUrl,
            serverFactory,
          );
        },
      },
    );
    return {
      client: new Client({ name: "SignuDoc protocol test", version: "1.0.0" }),
      transport,
    };
  }

  const { client, transport } = makeClient(context);
  try {
    await client.connect(transport);
    const upload = await client.callTool({
      name: "request_pdf_upload",
      arguments: {},
    });
    const uploadContract = upload.structuredContent as {
      method: "PUT";
      uploadId: string;
      url: string;
      headers: Record<string, string>;
    };
    assert.equal(uploadContract.uploadId, uploadId);
    assert.equal(uploadContract.url, "https://blob.example.test/upload-once");
    assert.equal(uploadContract.headers["content-type"], "application/pdf");
    const blobPut = new Request(uploadContract.url, {
      body: pdf,
      headers: uploadContract.headers,
      method: "PUT",
    });
    assert.equal(blobPut.method, uploadContract.method);
    pendingUploads.set(
      pendingUploadKeyFor(context.actor.userId, uploadId)!,
      new Uint8Array(await blobPut.arrayBuffer()),
    );

    const created = await client.callTool({
      name: "create_envelope_draft",
      arguments: {
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
        idempotencyKey: "protocol-create-1",
        signers: [
          { email: "signer@example.test", name: "Signer", ref: "client" },
        ],
        title: "Service agreement",
        uploadId,
      },
    });
    assert.equal(created.isError, undefined, JSON.stringify(created.content));
    assert.equal((created.structuredContent as { sent: boolean }).sent, false);
    assert.equal(
      (created.structuredContent as { draft: { status: string } }).draft.status,
      "draft",
    );

    const listed = await client.callTool({
      name: "list_envelopes",
      arguments: { status: "draft" },
    });
    assert.equal(
      (listed.structuredContent as { data: ApiEnvelope[] }).data[0]!.id,
      envelopeId,
    );
    const fetched = await client.callTool({
      name: "get_envelope",
      arguments: { envelopeId },
    });
    assert.equal(
      (fetched.structuredContent as { envelope: ApiEnvelope }).envelope.signers
        .length,
      1,
    );
    const events = await client.callTool({
      name: "list_envelope_events",
      arguments: { envelopeId },
    });
    assert.equal(
      (events.structuredContent as { events: Array<{ event: string }> })
        .events[0]!.event,
      "created",
    );

    const record = envelopes.get(envelopeId)!;
    record.envelope = {
      ...record.envelope,
      completedAt: "2026-11-23T00:01:00.000Z",
      status: "completed",
    };
    const downloaded = await client.callTool({
      name: "download_envelope_file",
      arguments: { envelopeId, file: "signed" },
    });
    assert.equal(
      (downloaded.structuredContent as { fileName?: string }).fileName,
      "agreement-signed.pdf",
    );
    assert.equal(
      downloaded.content.some((item) => item.type === "resource"),
      true,
    );
  } finally {
    await client.close();
  }

  const otherContext: ApiContext = {
    ...context,
    actor: { ...context.actor, apiKeyId: "prepare-key-2" },
  };
  const other = makeClient(otherContext);
  try {
    await other.client.connect(other.transport);
    const crossKey = await other.client.callTool({
      name: "get_envelope",
      arguments: { envelopeId },
    });
    const crossKeyEvents = await other.client.callTool({
      name: "list_envelope_events",
      arguments: { envelopeId },
    });
    const crossKeyFile = await other.client.callTool({
      name: "download_envelope_file",
      arguments: { envelopeId, file: "signed" },
    });
    assert.equal(crossKey.isError, true);
    assert.equal(crossKeyEvents.isError, true);
    assert.equal(crossKeyFile.isError, true);
    assert.match(
      crossKey.content[0]?.type === "text" ? crossKey.content[0].text : "",
      /not found/i,
    );
  } finally {
    await other.client.close();
  }
});
