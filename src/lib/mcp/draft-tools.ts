import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";

import {
  apiCreateEnvelopeSchema,
  createEnvelopeForApi,
  describeZodError,
  getApiEnvelope,
  type ApiCreateEnvelopeInput,
  type ApiEnvelope,
} from "../api/envelopes.ts";
import type { ApiContext } from "../api/route.ts";
import { issueApiUpload, pendingUploadKeyFor } from "../api/uploads.ts";
import { getDb } from "../db/connection.ts";
import { DocumentImportError } from "../services/document-import.ts";
import {
  discardPendingUpload,
  PendingUploadError,
  readPendingUpload,
} from "../services/pending-uploads.ts";
import {
  createStorageService,
  supportsDirectUploads,
} from "../services/storage.ts";
import { resolveAppUrl } from "../utils/env.ts";

export const MAX_INLINE_PDF_BYTES = 3 * 1024 * 1024;
const MAX_INLINE_PDF_BASE64_LENGTH = Math.ceil(MAX_INLINE_PDF_BYTES / 3) * 4;

const uploadInputSchema = z.object({}).strict();
const draftInputSchema = z
  .object({
    copyRecipients: apiCreateEnvelopeSchema.shape.copyRecipients,
    fields: apiCreateEnvelopeSchema.shape.fields,
    filename: z.string().trim().min(1).max(255),
    idempotencyKey: z.string().trim().min(1).max(255),
    metadata: apiCreateEnvelopeSchema.shape.metadata,
    pdfBase64: z.string().max(MAX_INLINE_PDF_BASE64_LENGTH).optional(),
    signers: apiCreateEnvelopeSchema.shape.signers,
    title: apiCreateEnvelopeSchema.shape.title,
    uploadId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      Number(input.pdfBase64 !== undefined) +
        Number(input.uploadId !== undefined) !==
      1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of pdfBase64 or uploadId.",
      });
    }
  });

export type DraftToolResult = {
  content: [{ type: "text"; text: string }];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
};

type Dependencies = {
  applyUploadLimit: (
    context: ApiContext,
    input: { key: string; limit: number; windowMs: number },
  ) => Promise<Response | null>;
  createEnvelopeForApi: typeof createEnvelopeForApi;
  createStorageService: typeof createStorageService;
  discardPendingUpload: typeof discardPendingUpload;
  getDatabase: typeof getDb;
  getApiEnvelope: typeof getApiEnvelope;
  issueApiUpload: typeof issueApiUpload;
  readPendingUpload: typeof readPendingUpload;
  resolveAppUrl: typeof resolveAppUrl;
  runIdempotently: (
    context: ApiContext,
    route: string,
    body: string,
    run: (
      remember: (resourceId: string) => Promise<void>,
    ) => Promise<{ body: unknown; status: number }>,
    recover: (resourceId: string) => Promise<{ body: unknown; status: number }>,
    limits: { key: string; limit: number; windowMs: number }[],
  ) => Promise<Response>;
  supportsDirectUploads: typeof supportsDirectUploads;
};

async function loadApiRoute() {
  return import("../api/route.ts");
}

const productionDependencies: Dependencies = {
  applyUploadLimit: async (...args) =>
    (await loadApiRoute()).applyAccountLimit(...args),
  createEnvelopeForApi,
  createStorageService,
  discardPendingUpload,
  getDatabase: getDb,
  getApiEnvelope,
  issueApiUpload,
  readPendingUpload,
  resolveAppUrl,
  runIdempotently: async (...args) =>
    (await loadApiRoute()).runIdempotently(...args),
  supportsDirectUploads,
};

function toolResult(
  value: Record<string, unknown>,
  text: string,
): DraftToolResult {
  return { content: [{ type: "text", text }], structuredContent: value };
}

function toolError(message: string): DraftToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function apiMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return "The request could not be completed.";
}

export function decodeInlinePdf(base64: string): Uint8Array {
  if (
    base64.length > MAX_INLINE_PDF_BASE64_LENGTH ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      base64,
    )
  ) {
    throw new Error("Provide a valid base64 encoded PDF no larger than 3 MiB.");
  }

  const bytes = Buffer.from(base64, "base64");

  if (
    bytes.byteLength > MAX_INLINE_PDF_BYTES ||
    bytes.toString("base64") !== base64 ||
    !Buffer.from(bytes.subarray(0, 5)).equals(Buffer.from("%PDF-"))
  ) {
    throw new Error("Provide a valid base64 encoded PDF no larger than 3 MiB.");
  }

  return new Uint8Array(bytes);
}

export function createDraftToolHandlers(
  context: ApiContext,
  dependencies: Partial<Dependencies> = {},
) {
  const deps = { ...productionDependencies, ...dependencies };

  return {
    async requestPdfUpload(): Promise<DraftToolResult> {
      if (!deps.supportsDirectUploads()) {
        return toolError(
          "Direct upload targets are not supported by this storage setup. Use inline PDF data up to 3 MiB.",
        );
      }

      try {
        const refused = await deps.applyUploadLimit(context, {
          key: "api-upload",
          limit: 60,
          windowMs: 10 * 60 * 1000,
        });
        if (refused) return toolError(apiMessage(await refused.json()));

        const upload = await deps.issueApiUpload(context.actor.userId);
        return toolResult(
          upload,
          `Upload the PDF with ${upload.method} to the provided URL before it expires.`,
        );
      } catch {
        return toolError(
          "Could not create an upload target. Try inline PDF data up to 3 MiB.",
        );
      }
    },

    async createEnvelopeDraft(input: unknown): Promise<DraftToolResult> {
      const parsed = draftInputSchema.safeParse(input);
      if (!parsed.success) return toolError(describeZodError(parsed.error));
      const args = parsed.data;
      const pendingKey = args.uploadId
        ? pendingUploadKeyFor(context.actor.userId, args.uploadId)
        : null;
      if (args.uploadId && !pendingKey)
        return toolError("Invalid upload reference.");

      const apiInputUnknown = {
        copyRecipients: args.copyRecipients,
        fields: args.fields,
        metadata: args.metadata,
        signers: args.signers,
        title: args.title,
      };
      const validated = apiCreateEnvelopeSchema.safeParse(apiInputUnknown);
      if (!validated.success)
        return toolError(describeZodError(validated.error));

      const appUrl = deps.resolveAppUrl();
      if (!appUrl)
        return toolError(
          "The application URL is not configured; the review link cannot be created.",
        );

      const headers = new Headers(context.request.headers);
      headers.set("idempotency-key", args.idempotencyKey);
      const idempotentContext = {
        ...context,
        request: new Request(context.request.url, { headers, method: "POST" }),
      };
      const idempotentBody = JSON.stringify({
        ...args,
        pdfBase64: args.pdfBase64 ?? undefined,
      });

      const storageService = pendingKey ? deps.createStorageService() : null;
      try {
        const response = await deps.runIdempotently(
          idempotentContext,
          "MCP create_envelope_draft",
          idempotentBody,
          async (remember) => {
            let sourcePdf: {
              body: Uint8Array;
              contentType: string;
              filename: string;
            };
            if (args.pdfBase64 !== undefined) {
              sourcePdf = {
                body: decodeInlinePdf(args.pdfBase64),
                contentType: "application/pdf",
                filename: args.filename,
              };
            } else {
              if (!pendingKey || !storageService) {
                throw new PendingUploadError("Invalid upload reference.");
              }
              sourcePdf = {
                body: await deps.readPendingUpload({
                  key: pendingKey,
                  storageService,
                  userId: context.actor.userId,
                }),
                contentType: "application/pdf",
                filename: args.filename,
              };
            }
            const envelope = await deps.createEnvelopeForApi(
              context.actor,
              validated.data as ApiCreateEnvelopeInput,
              sourcePdf,
              deps.getDatabase(),
              { onCreated: remember },
            );
            return { body: envelope, status: 201 };
          },
          async (envelopeId) => {
            const envelope = await deps.getApiEnvelope(
              context.actor.userId,
              envelopeId,
              undefined,
              {
                apiKeyId: context.actor.apiKeyId,
              },
            );
            return envelope
              ? { body: envelope, status: 201 }
              : {
                  body: {
                    error: {
                      message: "The saved draft could not be recovered.",
                    },
                  },
                  status: 404,
                };
          },
          [{ key: "api-envelope-create", limit: 60, windowMs: 10 * 60 * 1000 }],
        );
        const responseBody: unknown = await response.json();
        if (!response.ok) return toolError(apiMessage(responseBody));

        const envelope = responseBody as ApiEnvelope;
        const reviewUrl = new URL(
          `/envelopes/${encodeURIComponent(envelope.id)}`,
          appUrl,
        ).toString();
        if (pendingKey && storageService) {
          await deps.discardPendingUpload({ key: pendingKey, storageService });
        }
        const result = {
          draft: {
            id: envelope.id,
            status: envelope.status,
            title: envelope.title,
            signers: envelope.signers.map(({ email, name, status }) => ({
              email,
              name,
              status,
            })),
            copyRecipients: envelope.copyRecipients,
          },
          reviewUrl,
          sent: false,
        };
        return toolResult(
          result,
          `Draft created. Review it at ${reviewUrl}; it has not been sent.`,
        );
      } catch (error) {
        if (
          error instanceof DocumentImportError ||
          error instanceof PendingUploadError
        ) {
          return toolError(error.message);
        }
        return toolError(
          "Could not create the draft. Retry with the same idempotency key or review drafts in the dashboard.",
        );
      }
    },
  };
}

export function registerDraftTools(
  server: McpServer,
  context: ApiContext,
  dependencies: Partial<Dependencies> = {},
) {
  const handlers = createDraftToolHandlers(context, dependencies);
  server.registerTool(
    "request_pdf_upload",
    {
      description:
        "Create a short-lived, single-use PDF upload URL. Requires direct-upload storage; otherwise provide inline PDF data up to 3 MiB.",
      inputSchema: uploadInputSchema,
    },
    () => handlers.requestPdfUpload(),
  );
  server.registerTool(
    "create_envelope_draft",
    {
      description:
        "Create an unsent envelope draft for owner review. This tool cannot send envelopes.",
      inputSchema: draftInputSchema,
    },
    (input) => handlers.createEnvelopeDraft(input),
  );
}
