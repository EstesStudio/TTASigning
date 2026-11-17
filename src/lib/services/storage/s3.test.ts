import assert from "node:assert/strict";
import { test } from "node:test";

import { ServiceConfigurationError } from "../service-config.ts";
import { createStorageService } from "../storage.ts";
import { resolveStorageDriver, supportsDirectUploads } from "./driver.ts";
import { createS3StorageService, signS3Request } from "./s3.ts";
import { StorageObjectNotFoundError } from "./types.ts";

const env = {
  S3_ACCESS_KEY_ID: "test-access-key",
  S3_BUCKET: "documents",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com/",
  S3_SECRET_ACCESS_KEY: "test-secret-key",
};

type StoredObject = { body: Uint8Array; contentType: string };

// An in-memory stand-in for the bucket that records how it was called.
function createFakeBucket() {
  const objects = new Map<string, StoredObject>();
  const calls: Array<{ headers: Headers; method: string; url: string }> = [];

  const send = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);

    calls.push({ headers, method, url });

    const stored = objects.get(url);

    switch (method) {
      case "PUT": {
        if (headers.get("if-none-match") === "*" && stored) {
          return new Response("PreconditionFailed", { status: 412 });
        }

        objects.set(url, {
          body: new Uint8Array(init!.body as Uint8Array),
          contentType: headers.get("content-type") ?? "",
        });

        return new Response(null, { status: 200 });
      }
      case "DELETE":
        objects.delete(url);

        return new Response(null, { status: 204 });
      case "GET":
      case "HEAD":
        if (!stored) {
          return new Response(method === "GET" ? "NoSuchKey" : null, {
            status: 404,
          });
        }

        return new Response(
          method === "GET" ? (stored.body as BodyInit) : null,
          {
            headers: {
              "content-length": String(stored.body.byteLength),
              "content-type": stored.contentType,
              etag: '"etag"',
            },
            status: 200,
          },
        );
      default:
        return new Response(null, { status: 405 });
    }
  }) as typeof fetch;

  return { calls, objects, send };
}

const pdf = new TextEncoder().encode("%PDF-1.7 test");

// The two signatures below are the worked examples in the AWS documentation
// for Signature Version 4 on S3, "GET Object" and "PUT Object". A signature
// is made from the secret key and the request, not from the access key id,
// so the id here is a stand-in.
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
const documentedExample = {
  accessKeyId: "example-key-id",
  now: new Date("2013-05-24T00:00:00Z"),
  region: "us-east-1",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

test("signS3Request matches the signature in the AWS documentation", () => {
  const headers = signS3Request({
    ...documentedExample,
    headers: { Range: "bytes=0-9" },
    method: "GET",
    url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
  });

  assert.equal(
    headers.authorization,
    "AWS4-HMAC-SHA256 Credential=example-key-id/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  );
});

test("signS3Request matches the AWS documentation for an upload", () => {
  const headers = signS3Request({
    ...documentedExample,
    headers: {
      Date: "Fri, 24 May 2013 00:00:00 GMT",
      "x-amz-storage-class": "REDUCED_REDUNDANCY",
    },
    method: "PUT",
    payload: new TextEncoder().encode("Welcome to Amazon S3."),
    url: new URL("https://examplebucket.s3.amazonaws.com/test%24file.text"),
  });

  assert.match(
    headers.authorization,
    /Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd$/,
  );
});

test("stores, reads, describes and deletes an object", async () => {
  const bucket = createFakeBucket();
  const storage = createS3StorageService({ env, fetch: bucket.send });

  const ref = await storage.putObject({
    body: pdf,
    contentType: "application/pdf",
    key: "envelopes/abc/original.pdf",
  });

  assert.deepEqual(ref, {
    bucketName: "documents",
    key: "envelopes/abc/original.pdf",
  });
  assert.equal(
    bucket.calls[0].url,
    "https://account.r2.cloudflarestorage.com/documents/envelopes/abc/original.pdf",
  );
  assert.match(
    bucket.calls[0].headers.get("authorization") ?? "",
    /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/auto\/s3\/aws4_request, /,
  );
  assert.equal(bucket.calls[0].headers.get("if-none-match"), null);

  const object = await storage.getObject("envelopes/abc/original.pdf");

  assert.deepEqual(object.body, pdf);
  assert.equal(object.contentType, "application/pdf");
  assert.equal(object.contentLength, pdf.byteLength);
  assert.equal(object.etag, '"etag"');

  const streamed = await storage.getObjectStream("envelopes/abc/original.pdf");

  assert.equal(streamed.contentLength, pdf.byteLength);
  assert.deepEqual(
    new Uint8Array(await new Response(streamed.stream).arrayBuffer()),
    pdf,
  );

  assert.deepEqual(await storage.headObject("envelopes/abc/original.pdf"), {
    bucketName: "documents",
    contentLength: pdf.byteLength,
    contentType: "application/pdf",
    etag: '"etag"',
    exists: true,
    key: "envelopes/abc/original.pdf",
  });

  await storage.deleteObject("envelopes/abc/original.pdf");

  assert.equal(
    (await storage.headObject("envelopes/abc/original.pdf")).exists,
    false,
  );
});

test("a missing object is reported as not found, and deleting it is fine", async () => {
  const storage = createS3StorageService({
    env,
    fetch: createFakeBucket().send,
  });

  await assert.rejects(
    storage.getObject("missing.pdf"),
    StorageObjectNotFoundError,
  );
  await assert.rejects(
    storage.getObjectStream("missing.pdf"),
    StorageObjectNotFoundError,
  );
  await storage.deleteObject("missing.pdf");
});

test("keepExisting leaves the first object in place", async () => {
  const bucket = createFakeBucket();
  const storage = createS3StorageService({ env, fetch: bucket.send });
  const second = new TextEncoder().encode("%PDF-1.7 second");

  await storage.putObject({
    body: pdf,
    contentType: "application/pdf",
    key: "sealed.pdf",
    keepExisting: true,
  });
  await storage.putObject({
    body: second,
    contentType: "application/pdf",
    key: "sealed.pdf",
    keepExisting: true,
  });

  assert.equal(bucket.calls[1].headers.get("if-none-match"), "*");
  assert.deepEqual((await storage.getObject("sealed.pdf")).body, pdf);

  // Without it, a write replaces what is there.
  await storage.putObject({
    body: second,
    contentType: "application/pdf",
    key: "sealed.pdf",
  });

  assert.deepEqual((await storage.getObject("sealed.pdf")).body, second);
});

test("a write the store refuses is a failure", async () => {
  const refuse = (async () =>
    new Response("AccessDenied", { status: 403 })) as typeof fetch;
  const storage = createS3StorageService({ env, fetch: refuse });

  await assert.rejects(
    storage.putObject({
      body: pdf,
      contentType: "application/pdf",
      key: "a.pdf",
      keepExisting: true,
    }),
    /403 AccessDenied/,
  );
  await assert.rejects(storage.headObject("a.pdf"), /403/);
  await assert.rejects(storage.deleteObject("a.pdf"), /403/);
});

test("keys are encoded into the path and unsafe keys are refused", async () => {
  const bucket = createFakeBucket();
  const storage = createS3StorageService({ env, fetch: bucket.send });

  await storage.putObject({
    body: pdf,
    contentType: "application/pdf",
    key: "uploads/Jan's file (1).pdf",
  });

  assert.equal(
    bucket.calls[0].url,
    "https://account.r2.cloudflarestorage.com/documents/uploads/Jan%27s%20file%20%281%29.pdf",
  );
  await assert.rejects(storage.getObject("../other-bucket/x"), /invalid/);
});

test("names the settings that are missing", () => {
  assert.throws(
    () => createS3StorageService({ env: { S3_BUCKET: "documents" } }),
    (error: unknown) =>
      error instanceof ServiceConfigurationError &&
      /S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY$/.test(
        error.message,
      ),
  );
});

test("STORAGE_DRIVER=s3 selects this driver, without direct uploads", () => {
  const s3Env = { ...env, STORAGE_DRIVER: "s3" };

  assert.equal(resolveStorageDriver(s3Env), "s3");
  // PDFs go through the app, as with local storage.
  assert.equal(supportsDirectUploads(s3Env), false);
  // The settings alone do not select it.
  assert.equal(resolveStorageDriver(env), "local");
  assert.throws(
    () => createStorageService({ env: { STORAGE_DRIVER: "s3" } }),
    ServiceConfigurationError,
  );
});
