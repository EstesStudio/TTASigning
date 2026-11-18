import assert from "node:assert/strict";
import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { test, type TestContext } from "node:test";

import { S3ServiceException } from "@aws-sdk/client-s3";

import { ServiceConfigurationError } from "../service-config.ts";
import {
  createStorageService,
  StorageObjectNotFoundError,
} from "../storage.ts";

const env = {
  STORAGE_DRIVER: "s3",
  S3_BUCKET: "test-documents",
  S3_REGION: "us-east-1",
};

const objectPath = "/test-documents/records/file.pdf";
const inputKey = " /records\\file.pdf ";
const input = {
  body: Uint8Array.of(0, 127, 255),
  contentType: "application/pdf",
  key: inputKey,
};
const objectRef = { bucketName: "test-documents", key: "records/file.pdf" };

async function createTestService(
  t: TestContext,
  respond: (request: IncomingMessage, response: ServerResponse) => void,
) {
  const credentials = {
    AWS_ACCESS_KEY_ID: "test-access",
    AWS_SECRET_ACCESS_KEY: "test-secret",
    AWS_SESSION_TOKEN: "test-session",
    AWS_PROFILE: undefined,
    AWS_ENDPOINT_URL_S3: undefined,
    AWS_ENDPOINT_URL: undefined,
  };

  for (const [name, value] of Object.entries(credentials)) {
    const previous = process.env[name];

    if (value === undefined) delete process.env[name];
    else process.env[name] = value;

    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }

  const server = createServer(respond);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return createStorageService({
    env: {
      ...env,
      S3_ENDPOINT: `http://127.0.0.1:${address.port}`,
      S3_FORCE_PATH_STYLE: "true",
    },
  });
}

function respondWithError(
  response: ServerResponse,
  status: number,
  code: string,
) {
  response.writeHead(status, { "Content-Type": "application/xml" });
  response.end(`<Error><Code>${code}</Code><Message>${code}</Message></Error>`);
}

test("S3 requires a nonempty bucket and region before creating a client", () => {
  for (const name of ["S3_BUCKET", "S3_REGION"] as const) {
    for (const value of [undefined, " ", "replace-with-setting"]) {
      assert.throws(
        () => createStorageService({ env: { ...env, [name]: value } }),
        (error: Error) =>
          error instanceof ServiceConfigurationError &&
          error.message.includes(name),
      );
    }
  }
});

test("S3 force path style accepts only true or false when set", () => {
  for (const value of [undefined, "false", "true"]) {
    assert.doesNotThrow(() =>
      createStorageService({ env: { ...env, S3_FORCE_PATH_STYLE: value } }),
    );
  }

  for (const value of ["", "1", "0", "TRUE", " false "]) {
    assert.throws(
      () =>
        createStorageService({ env: { ...env, S3_FORCE_PATH_STYLE: value } }),
      /S3_FORCE_PATH_STYLE/,
    );
  }
});

test("S3 rejects malformed endpoints without echoing their values", () => {
  for (const endpoint of [
    "example.test",
    "ftp://example.test",
    "https://user:secret@example.test",
    "https://example.test/?token=secret",
    "https://example.test/#secret",
  ]) {
    assert.throws(
      () => createStorageService({ env: { ...env, S3_ENDPOINT: endpoint } }),
      (error: Error) =>
        error.message.includes("S3_ENDPOINT") &&
        !error.message.includes(endpoint) &&
        !error.message.includes("secret"),
    );
  }
});

test("S3 reads, writes, and deletes normalized objects over signed requests", async (t) => {
  const calls: Array<{
    method: string | undefined;
    path: string | undefined;
    auth: string | undefined;
    sessionToken: string | string[] | undefined;
    contentType: string | undefined;
    acl: string | string[] | undefined;
  }> = [];
  let storedBody = Buffer.alloc(0);
  const storage = await createTestService(t, (request, response) => {
    calls.push({
      method: request.method,
      path: request.url?.split("?")[0],
      auth: request.headers.authorization,
      sessionToken: request.headers["x-amz-security-token"],
      contentType: request.headers["content-type"],
      acl: request.headers["x-amz-acl"],
    });

    if (request.method === "PUT") {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        storedBody = Buffer.concat(chunks);
        response.end();
      });
    } else if (request.method === "HEAD" || request.method === "GET") {
      response.writeHead(200, {
        "Content-Length": storedBody.length,
        "Content-Type": "application/pdf",
        ETag: '"test-etag"',
      });
      response.end(request.method === "GET" ? storedBody : undefined);
    } else {
      response.writeHead(204).end();
    }
  });

  assert.deepEqual(await storage.putObject(input), objectRef);
  assert.deepEqual(await storage.getObject(inputKey), {
    ...objectRef,
    body: Uint8Array.of(0, 127, 255),
    contentLength: 3,
    contentType: "application/pdf",
    etag: '"test-etag"',
  });
  const { stream, ...streamMetadata } = await storage.getObjectStream(inputKey);
  assert.ok(stream instanceof ReadableStream);
  assert.deepEqual(
    new Uint8Array(await new Response(stream).arrayBuffer()),
    Uint8Array.of(0, 127, 255),
  );
  assert.deepEqual(streamMetadata, {
    ...objectRef,
    contentLength: 3,
    contentType: "application/pdf",
  });
  assert.deepEqual(await storage.headObject(inputKey), {
    ...objectRef,
    contentLength: 3,
    contentType: "application/pdf",
    etag: '"test-etag"',
    exists: true,
  });
  await storage.deleteObject(inputKey);

  assert.deepEqual(
    calls.map(({ method, path }) => [method, path]),
    ["PUT", "GET", "GET", "HEAD", "DELETE"].map((method) => [
      method,
      objectPath,
    ]),
  );
  for (const { auth, sessionToken, acl } of calls) {
    assert.match(
      auth ?? "",
      /^AWS4-HMAC-SHA256 Credential=test-access\/\d{8}\/us-east-1\/s3\/aws4_request/,
    );
    assert.equal(sessionToken, "test-session");
    assert.equal(acl, undefined);
  }
  assert.equal(calls[0].contentType, "application/pdf");
});

test("S3 rejects invalid keys before issuing a request", async (t) => {
  let calls = 0;
  const storage = await createTestService(t, (_, response) => {
    calls++;
    response.writeHead(500).end();
  });
  const key = "records/../other.pdf";

  await assert.rejects(storage.getObject(key), /Storage key is invalid/);
  await assert.rejects(storage.getObjectStream(key), /Storage key is invalid/);
  await assert.rejects(storage.headObject(key), /Storage key is invalid/);
  await assert.rejects(storage.deleteObject(key), /Storage key is invalid/);
  await assert.rejects(
    storage.putObject({ ...input, key }),
    /Storage key is invalid/,
  );
  assert.equal(calls, 0);
});

test("S3 maps known object absence and allows deleting an absent object", async (t) => {
  const storage = await createTestService(t, (request, response) => {
    if (request.method === "HEAD") {
      response.writeHead(request.url === objectPath ? 404 : 200).end();
    } else if (request.method === "DELETE") {
      response.writeHead(204).end();
    } else {
      respondWithError(response, 404, "NoSuchKey");
    }
  });

  await assert.rejects(storage.getObject(inputKey), StorageObjectNotFoundError);
  await assert.rejects(
    storage.getObjectStream(inputKey),
    StorageObjectNotFoundError,
  );
  assert.deepEqual(await storage.headObject(inputKey), {
    ...objectRef,
    exists: false,
  });
  await storage.deleteObject(inputKey);
});

test("S3 propagates a missing bucket even for a HEAD without an error body", async (t) => {
  const storage = await createTestService(t, (request, response) => {
    if (request.method === "HEAD") {
      response.writeHead(404).end();
    } else {
      respondWithError(response, 404, "NoSuchBucket");
    }
  });

  const noSuchBucket = { name: "NoSuchBucket" };
  await assert.rejects(storage.getObject(inputKey), noSuchBucket);
  await assert.rejects(storage.getObjectStream(inputKey), noSuchBucket);
  await assert.rejects(storage.deleteObject(inputKey), noSuchBucket);
  await assert.rejects(
    storage.putObject({ ...input, keepExisting: true }),
    noSuchBucket,
  );
  await assert.rejects(
    storage.headObject(inputKey),
    (error: unknown) =>
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 404,
  );
});

test("S3 propagates permission failures without attempting a bucket probe", async (t) => {
  const methods: string[] = [];
  const storage = await createTestService(t, (request, response) => {
    methods.push(request.method ?? "");
    respondWithError(response, 403, "AccessDenied");
  });

  await assert.rejects(storage.getObject(inputKey), { name: "AccessDenied" });
  await assert.rejects(
    storage.headObject(inputKey),
    (error: unknown) =>
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 403,
  );
  await assert.rejects(storage.deleteObject(inputKey), {
    name: "AccessDenied",
  });
  await assert.rejects(storage.putObject({ ...input, keepExisting: true }), {
    name: "AccessDenied",
  });
  assert.deepEqual(methods, ["GET", "HEAD", "DELETE", "PUT"]);
});

test("S3 propagates transient failures after bounded SDK retries", async (t) => {
  let calls = 0;
  const storage = await createTestService(t, (request, response) => {
    calls++;
    if (request.method === "GET") {
      request.socket.destroy();
    } else {
      respondWithError(response, 500, "InternalError");
    }
  });

  await assert.rejects(storage.getObject(inputKey), { code: "ECONNRESET" });
  await assert.rejects(storage.putObject({ ...input, keepExisting: true }), {
    name: "InternalError",
  });
  assert.equal(calls, 6);
});

test("S3 only accepts a 412 response for a conditional write", async (t) => {
  const conditions: Array<string | undefined> = [];
  const storage = await createTestService(t, (request, response) => {
    conditions.push(request.headers["if-none-match"]);
    respondWithError(response, 412, "PreconditionFailed");
  });

  assert.deepEqual(
    await storage.putObject({ ...input, keepExisting: true }),
    objectRef,
  );
  await assert.rejects(storage.putObject(input), {
    name: "PreconditionFailed",
  });
  assert.deepEqual(conditions, ["*", undefined]);
});

test("S3 retries a conditional conflict without dropping the precondition", async (t) => {
  const conditions: Array<string | undefined> = [];
  const storage = await createTestService(t, (request, response) => {
    conditions.push(request.headers["if-none-match"]);
    if (conditions.length === 1) {
      respondWithError(response, 409, "ConditionalRequestConflict");
    } else {
      respondWithError(response, 412, "PreconditionFailed");
    }
  });

  assert.deepEqual(
    await storage.putObject({ ...input, keepExisting: true }),
    objectRef,
  );
  assert.deepEqual(conditions, ["*", "*"]);
});

test("S3 stops retrying a repeated conditional conflict", async (t) => {
  const conditions: Array<string | undefined> = [];
  const storage = await createTestService(t, (request, response) => {
    conditions.push(request.headers["if-none-match"]);
    respondWithError(response, 409, "ConditionalRequestConflict");
  });

  await assert.rejects(storage.putObject({ ...input, keepExisting: true }), {
    name: "ConditionalRequestConflict",
  });
  await assert.rejects(storage.putObject(input), {
    name: "ConditionalRequestConflict",
  });
  assert.deepEqual(conditions, ["*", "*", "*", undefined]);
});
