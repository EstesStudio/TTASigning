import { createHash, createHmac } from "node:crypto";

import { type EnvSource } from "../../utils/env.ts";
import { ServiceConfigurationError } from "../service-config.ts";
import {
  normalizeStorageKey,
  type StorageObjectHead,
  StorageObjectNotFoundError,
  type StorageService,
} from "./types.ts";

// Storage in a private bucket of any S3-compatible store: Cloudflare R2,
// AWS S3, MinIO and the like. Nothing in the bucket has a public URL, and
// every read goes through the app, which checks who is asking first.
//
// Requests are signed here (AWS Signature Version 4) with node:crypto
// instead of an SDK. The driver needs four calls on one object, and signing
// them by hand keeps the app's dependencies as they are.
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html

const REQUIRED_VARIABLES = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
] as const;
// R2 takes "auto". AWS needs the bucket's own region, set with S3_REGION.
const DEFAULT_REGION = "auto";

type SignRequestInput = {
  accessKeyId: string;
  /** Headers to send and sign, besides the ones signing adds. */
  headers?: Record<string, string>;
  method: string;
  now?: Date;
  payload?: Uint8Array;
  region: string;
  secretAccessKey: string;
  url: URL;
};

function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

// S3 wants every byte outside the unreserved set percent-encoded, which
// encodeURIComponent does except for these five.
function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Returns the headers for one signed request: the ones passed in, plus
 * host, x-amz-date, x-amz-content-sha256 and authorization. The URL must
 * have no query string, which is all this driver ever sends.
 */
export function signS3Request({
  accessKeyId,
  headers = {},
  method,
  now = new Date(),
  payload = new Uint8Array(),
  region,
  secretAccessKey,
  url,
}: SignRequestInput): Record<string, string> {
  const timestamp = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const date = timestamp.slice(0, 8);
  const payloadHash = sha256Hex(payload);
  const signed: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
  };

  for (const [name, value] of Object.entries(headers)) {
    signed[name.toLowerCase()] = value.trim();
  }

  const headerNames = Object.keys(signed).sort();
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    ...headerNames.map((name) => `${name}:${signed[name]}`),
    "",
    headerNames.join(";"),
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), "s3"),
    "aws4_request",
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return {
    ...signed,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${headerNames.join(";")}, Signature=${signature}`,
  };
}

type CreateS3StorageServiceOptions = {
  env?: EnvSource;
  /** Replaced by a fake in tests. */
  fetch?: typeof fetch;
};

export function createS3StorageService({
  env = process.env,
  fetch: send = fetch,
}: CreateS3StorageServiceOptions = {}): StorageService {
  const missing = REQUIRED_VARIABLES.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    throw new ServiceConfigurationError("storage", missing);
  }

  const endpoint = env.S3_ENDPOINT!.trim().replace(/\/+$/, "");
  const bucket = env.S3_BUCKET!.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID!.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY!.trim();
  const region = env.S3_REGION?.trim() || DEFAULT_REGION;

  async function request(
    method: string,
    key: string,
    options: { body?: Uint8Array; headers?: Record<string, string> } = {},
  ) {
    const normalizedKey = normalizeStorageKey(key);
    // Path-style addressing (endpoint/bucket/key), which every
    // S3-compatible store accepts.
    const url = new URL(
      `${endpoint}/${encodePathSegment(bucket)}/${normalizedKey
        .split("/")
        .map(encodePathSegment)
        .join("/")}`,
    );
    const headers = signS3Request({
      accessKeyId,
      headers: options.headers,
      method,
      payload: options.body,
      region,
      secretAccessKey,
      url,
    });

    // fetch sets the host header itself.
    delete headers.host;

    const response = await send(url, {
      body: options.body as BodyInit | undefined,
      headers,
      method,
    });

    return { normalizedKey, response };
  }

  async function fail(
    action: string,
    key: string,
    response: Response,
  ): Promise<never> {
    const detail = (await response.text().catch(() => "")).slice(0, 300);

    throw new Error(
      `Storage ${action} failed for ${key}: ${response.status} ${detail}`.trim(),
    );
  }

  function contentLengthOf(response: Response): number | undefined {
    const value = response.headers.get("content-length");

    return value === null ? undefined : Number.parseInt(value, 10);
  }

  async function fetchObject(key: string) {
    const { normalizedKey, response } = await request("GET", key);

    if (response.status === 404) {
      await response.body?.cancel();
      throw new StorageObjectNotFoundError(normalizedKey);
    }

    if (!response.ok) {
      await fail("read", normalizedKey, response);
    }

    return { normalizedKey, response };
  }

  async function headObject(key: string): Promise<StorageObjectHead> {
    const { normalizedKey, response } = await request("HEAD", key);

    if (response.status === 404) {
      return { bucketName: bucket, exists: false, key: normalizedKey };
    }

    if (!response.ok) {
      await fail("lookup", normalizedKey, response);
    }

    return {
      bucketName: bucket,
      contentLength: contentLengthOf(response),
      contentType: response.headers.get("content-type") ?? undefined,
      etag: response.headers.get("etag") ?? undefined,
      exists: true,
      key: normalizedKey,
    };
  }

  return {
    async deleteObject(key) {
      const { normalizedKey, response } = await request("DELETE", key);

      // Deleting something that is not there is not a failure.
      if (!response.ok && response.status !== 404) {
        await fail("delete", normalizedKey, response);
      }

      await response.body?.cancel();
    },
    async getObject(key) {
      const { normalizedKey, response } = await fetchObject(key);
      const body = new Uint8Array(await response.arrayBuffer());

      return {
        body,
        bucketName: bucket,
        contentLength: body.byteLength,
        contentType: response.headers.get("content-type") ?? undefined,
        etag: response.headers.get("etag") ?? undefined,
        key: normalizedKey,
      };
    },
    async getObjectStream(key) {
      const { normalizedKey, response } = await fetchObject(key);

      return {
        bucketName: bucket,
        contentLength: contentLengthOf(response),
        contentType: response.headers.get("content-type") ?? undefined,
        key: normalizedKey,
        stream:
          response.body ??
          new ReadableStream<Uint8Array>({
            start: (controller) => controller.close(),
          }),
      };
    },
    headObject,
    async putObject(input) {
      const { normalizedKey, response } = await request("PUT", input.key, {
        body: input.body,
        headers: {
          "content-type": input.contentType,
          // The store refuses the write when something is already stored
          // under the key, so of two writers that arrive together exactly
          // one is kept.
          ...(input.keepExisting ? { "if-none-match": "*" } : {}),
        },
      });

      // 412: an object is already there, which is what keepExisting asks for.
      if (!response.ok && !(input.keepExisting && response.status === 412)) {
        await fail("write", normalizedKey, response);
      }

      await response.body?.cancel();

      return { bucketName: bucket, key: normalizedKey };
    },
  };
}
