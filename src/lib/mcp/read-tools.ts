import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";

import {
  apiListQuerySchema,
  describeZodError,
  getApiEnvelope,
  listApiEnvelopeEvents,
  listApiEnvelopes,
} from "../api/envelopes.ts";
import type { ApiContext } from "../api/route.ts";
import { getDb } from "../db/connection.ts";
import {
  DownloadAccessError,
  getSenderEnvelopeDownload,
} from "../downloads.ts";
import {
  createStorageService,
  StorageObjectNotFoundError,
} from "../services/storage.ts";

const listInputSchema = apiListQuerySchema.strict();
const envelopeInputSchema = z
  .object({ envelopeId: z.string().uuid() })
  .strict();
const fileInputSchema = z
  .object({
    envelopeId: z.string().uuid(),
    file: z.enum(["signed", "certificate"]),
  })
  .strict();

type TextContent = { type: "text"; text: string };
type ReadToolResult = {
  content: Array<
    | TextContent
    | {
        type: "resource";
        resource: { uri: string; mimeType: string; blob: string };
      }
  >;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

type Dependencies = {
  createStorageService: typeof createStorageService;
  getApiEnvelope: typeof getApiEnvelope;
  getDatabase: typeof getDb;
  getSenderEnvelopeDownload: typeof getSenderEnvelopeDownload;
  listApiEnvelopeEvents: typeof listApiEnvelopeEvents;
  listApiEnvelopes: typeof listApiEnvelopes;
};

const productionDependencies: Dependencies = {
  createStorageService,
  getApiEnvelope,
  getDatabase: getDb,
  getSenderEnvelopeDownload,
  listApiEnvelopeEvents,
  listApiEnvelopes,
};

function result(value: Record<string, unknown>, text: string): ReadToolResult {
  return { content: [{ type: "text", text }], structuredContent: value };
}

function failure(message: string): ReadToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function accessFilter(context: ApiContext) {
  return context.actor.scope === "prepare"
    ? { apiKeyId: context.actor.apiKeyId }
    : undefined;
}

function errorStatus(error: unknown): number | undefined {
  return error instanceof DownloadAccessError
    ? error.statusCode
    : typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;
}

export function createReadToolHandlers(
  context: ApiContext,
  dependencies: Partial<Dependencies> = {},
) {
  const deps = { ...productionDependencies, ...dependencies };

  return {
    async listEnvelopes(input: unknown): Promise<ReadToolResult> {
      const parsed = listInputSchema.safeParse(input);
      if (!parsed.success) return failure(describeZodError(parsed.error));

      try {
        const page = await deps.listApiEnvelopes(
          context.actor.userId,
          parsed.data,
          deps.getDatabase(),
          accessFilter(context),
        );
        if (!page) return failure("The envelope cursor is invalid.");
        const value = { data: page.data, nextCursor: page.nextCursor };
        return result(value, JSON.stringify(value));
      } catch {
        return failure("Could not list envelopes right now.");
      }
    },

    async getEnvelope(input: unknown): Promise<ReadToolResult> {
      const parsed = envelopeInputSchema.safeParse(input);
      if (!parsed.success) return failure(describeZodError(parsed.error));

      try {
        const envelope = await deps.getApiEnvelope(
          context.actor.userId,
          parsed.data.envelopeId,
          deps.getDatabase(),
          accessFilter(context),
        );
        return envelope
          ? result({ envelope }, JSON.stringify(envelope))
          : failure("Envelope not found.");
      } catch {
        return failure("Could not read this envelope right now.");
      }
    },

    async listEnvelopeEvents(input: unknown): Promise<ReadToolResult> {
      const parsed = envelopeInputSchema.safeParse(input);
      if (!parsed.success) return failure(describeZodError(parsed.error));

      try {
        const events = await deps.listApiEnvelopeEvents(
          context.actor.userId,
          parsed.data.envelopeId,
          deps.getDatabase(),
          accessFilter(context),
        );
        return events
          ? result({ events }, JSON.stringify(events))
          : failure("Envelope not found.");
      } catch {
        return failure(
          "Could not read this envelope's audit events right now.",
        );
      }
    },

    async downloadEnvelopeFile(input: unknown): Promise<ReadToolResult> {
      const parsed = fileInputSchema.safeParse(input);
      if (!parsed.success) return failure(describeZodError(parsed.error));
      const { envelopeId, file } = parsed.data;

      try {
        // The sender download service checks account ownership. This API-view
        // check adds prepare-key ownership before any file is resolved.
        const envelope = await deps.getApiEnvelope(
          context.actor.userId,
          envelopeId,
          deps.getDatabase(),
          accessFilter(context),
        );
        if (!envelope) return failure("Envelope not found.");

        const download = await deps.getSenderEnvelopeDownload(
          context.actor.userId,
          envelopeId,
          file === "signed" ? "signed" : "evidence",
          { database: deps.getDatabase() },
        );
        const body =
          "body" in download
            ? download.body
            : (await deps.createStorageService().getObject(download.key)).body;
        const mimeType = download.contentType || "application/pdf";
        const uri = `signudoc://envelopes/${encodeURIComponent(envelopeId)}/files/${file}/${encodeURIComponent(download.fileName)}`;

        return {
          content: [
            {
              type: "text",
              text: `Downloaded ${download.fileName} (${mimeType}, ${String(body.byteLength)} bytes).`,
            },
            {
              type: "resource",
              resource: {
                uri,
                mimeType,
                blob: Buffer.from(body).toString("base64"),
              },
            },
          ],
          structuredContent: {
            available: true,
            byteLength: body.byteLength,
            fileName: download.fileName,
            mimeType,
          },
        };
      } catch (error) {
        const status = errorStatus(error);
        if (status === 409) {
          return result(
            { available: false, envelopeId, file },
            "This file is not available yet. Check the envelope status and try again when signing is complete.",
          );
        }
        if (status === 404)
          return failure("Envelope or requested file not found.");
        if (error instanceof StorageObjectNotFoundError) {
          return failure("The requested file is no longer available.");
        }
        return failure("Could not download this file right now.");
      }
    },
  };
}

export function registerReadTools(
  server: McpServer,
  context: ApiContext,
  dependencies: Partial<Dependencies> = {},
) {
  const handlers = createReadToolHandlers(context, dependencies);
  server.registerTool(
    "list_envelopes",
    {
      description:
        "List this API key's envelopes newest first. Supports status filtering and cursor pagination.",
      inputSchema: listInputSchema,
    },
    (input) => handlers.listEnvelopes(input),
  );
  server.registerTool(
    "get_envelope",
    {
      description:
        "Get envelope status, signer and approver progress, and copy recipients.",
      inputSchema: envelopeInputSchema,
    },
    (input) => handlers.getEnvelope(input),
  );
  server.registerTool(
    "list_envelope_events",
    {
      description: "Get an envelope's audit events in oldest-first order.",
      inputSchema: envelopeInputSchema,
    },
    (input) => handlers.listEnvelopeEvents(input),
  );
  server.registerTool(
    "download_envelope_file",
    {
      description:
        "Download the completed signed PDF or the envelope audit certificate as a binary PDF resource.",
      inputSchema: fileInputSchema,
    },
    (input) => handlers.downloadEnvelopeFile(input),
  );
}
