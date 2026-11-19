import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

import { openTestDatabase } from "../db/test-database.ts";
import { createStorageService } from "../services/storage.ts";
import { getSigningPayloadForToken } from "../signing.ts";
import {
  ApiDocumentError,
  cancelApiDocument,
  createApiDocument,
  createApiDocumentSchema,
  getApiDocument,
} from "./api-documents.ts";
import {
  authenticateApiKey,
  createApiKey,
  type ApiKeyPrincipal,
} from "./api-keys.ts";
import {
  eraseDocuments,
  getCompanyUsage,
  listApiDocuments,
  listDocumentsQuerySchema,
} from "./companies.ts";

// Documents by business: listing, usage and erasure, against a real Postgres
// and files on a temporary disk. Run with `npm run test:db`.

let database: pg.Pool;
let workDir: string;
const createdUsers: string[] = [];
const context = { ipAddress: "203.0.113.4", userAgent: "petsky-test" };

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "petskysign-companies-"));
  process.env.APP_URL = "https://assinar.example.test";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = path.join(workDir, "storage");
  process.env.EMAIL_DRIVER = "capture";
  process.env.EMAIL_CAPTURE_DIR = path.join(workDir, "outbox");
  process.env.WEBHOOK_DELIVERY_ON_COMMIT = "0";
  database = await openTestDatabase();
  globalThis.__signudocPgPool = database;
});

after(async () => {
  await database.query(`delete from public."user" where id = any($1)`, [
    createdUsers,
  ]);
  await database.end();
  await rm(workDir, { force: true, recursive: true });
});

async function principal(): Promise<ApiKeyPrincipal> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `
      insert into public."user" (id, name, email, "emailVerified", role)
      values ($1, 'Petsky', $2, true, 'user')
    `,
    [userId, `${userId}@example.test`],
  );

  const key = await createApiKey({ name: "t", userId }, database);
  const found = await authenticateApiKey(key.key, database);

  assert.ok(found);
  return found;
}

async function send(
  owner: ApiKeyPrincipal,
  companyRef: string,
  externalRef = `c-${randomUUID()}`,
) {
  const pdf = await PDFDocument.create();

  pdf.addPage([595, 842]);

  return createApiDocument(
    owner,
    createApiDocumentSchema.parse({
      companyRef,
      externalRef,
      permittedUseConfirmed: true,
      signer: { name: "Tutor" },
      title: `Contrato ${externalRef}`,
    }),
    {
      body: await pdf.save(),
      contentType: "application/pdf",
      filename: "c.pdf",
    },
    context,
    database,
  );
}

const query = (input: Record<string, unknown>) =>
  listDocumentsQuerySchema.parse(input);

test("documents are listed by business, newest first, a page at a time", async () => {
  const owner = await principal();
  const sent = [];

  for (let index = 0; index < 5; index += 1) {
    sent.push(await send(owner, "casa-a", `a-${index}`));
    // Distinct created_at seconds are not guaranteed; ids break ties.
  }

  await send(owner, "casa-b", "b-0");

  const first = await listApiDocuments(
    owner,
    query({ companyRef: "casa-a", limit: 2 }),
    database,
  );

  assert.equal(first.documents.length, 2);
  assert.ok(first.nextCursor);
  assert.ok(first.documents.every((doc) => doc.companyRef === "casa-a"));

  const seen = new Set(first.documents.map((doc) => doc.documentId));
  let cursor: string | null = first.nextCursor;

  while (cursor) {
    const page = await listApiDocuments(
      owner,
      query({ companyRef: "casa-a", cursor, limit: 2 }),
      database,
    );

    for (const doc of page.documents) {
      assert.ok(!seen.has(doc.documentId), "a document came back twice");
      seen.add(doc.documentId);
    }

    cursor = page.nextCursor;
  }

  assert.deepEqual([...seen].sort(), sent.map((doc) => doc.documentId).sort());

  const byRef = await listApiDocuments(
    owner,
    query({ externalRef: "a-3" }),
    database,
  );

  assert.deepEqual(
    byRef.documents.map((doc) => doc.documentId),
    [sent[3]!.documentId],
  );

  await cancelApiDocument(owner, sent[0]!.documentId, null, context, database);

  const voided = await listApiDocuments(
    owner,
    query({ companyRef: "casa-a", status: "voided" }),
    database,
  );

  assert.deepEqual(
    voided.documents.map((doc) => doc.documentId),
    [sent[0]!.documentId],
  );

  // Past its deadline, a document is listed (and filtered) as expired.
  await database.query(`update envelopes set expires_at = 1 where id = $1`, [
    sent[1]!.documentId,
  ]);

  const expired = await listApiDocuments(
    owner,
    query({ companyRef: "casa-a", status: "expired" }),
    database,
  );
  const stillSent = await listApiDocuments(
    owner,
    query({ companyRef: "casa-a", status: "sent" }),
    database,
  );

  assert.deepEqual(
    expired.documents.map((doc) => [doc.documentId, doc.status]),
    [[sent[1]!.documentId, "expired"]],
  );
  assert.equal(stillSent.documents.length, 3);

  // Another account's key sees none of it, whatever it asks for.
  const stranger = await principal();

  assert.deepEqual(
    (
      await listApiDocuments(
        stranger,
        query({ companyRef: "casa-a" }),
        database,
      )
    ).documents,
    [],
  );
  await assert.rejects(
    listApiDocuments(owner, query({ cursor: "bad" }), database),
    ApiDocumentError,
  );
});

test("usage counts what a business sent in the period, by where it stands", async () => {
  const owner = await principal();
  const one = await send(owner, "casa-u");

  await send(owner, "casa-u");
  await send(owner, "casa-outra");
  await cancelApiDocument(owner, one.documentId, null, context, database);

  const usage = await getCompanyUsage(owner, "casa-u", {}, database);

  assert.equal(usage.sent, 2);
  assert.equal(usage.byStatus.voided, 1);
  assert.equal(usage.byStatus.sent, 1);
  assert.equal(usage.byStatus.completed, 0);

  const before = await getCompanyUsage(
    owner,
    "casa-u",
    { from: "2020-01-01", to: "2020-02-01" },
    database,
  );

  assert.equal(before.sent, 0);
  await assert.rejects(
    getCompanyUsage(owner, "casa-u", { from: "ontem" }, database),
    ApiDocumentError,
  );
});

test("erasing a document deletes its row, files and link, and records the erasure", async () => {
  const owner = await principal();
  const sent = await send(owner, "casa-e");
  const keys = await database.query<{ source_pdf_key: string }>(
    `select source_pdf_key from envelopes where id = $1`,
    [sent.documentId],
  );
  const storage = createStorageService();
  const sourceKey = keys.rows[0]!.source_pdf_key;

  assert.equal((await storage.headObject(sourceKey)).exists, true);

  // Another account cannot erase it.
  await assert.rejects(
    eraseDocuments(
      await principal(),
      { documentId: sent.documentId },
      context,
      database,
    ),
    (error: unknown) =>
      error instanceof ApiDocumentError && error.statusCode === 404,
  );

  const result = await eraseDocuments(
    owner,
    { documentId: sent.documentId },
    context,
    database,
  );

  assert.deepEqual(result, {
    deleted: 1,
    documentIds: [sent.documentId],
    failed: [],
  });
  assert.equal((await storage.headObject(sourceKey)).exists, false);
  await assert.rejects(getApiDocument(owner, sent.documentId, database));
  await assert.rejects(
    getSigningPayloadForToken(
      new URL(sent.signLink!).pathname.split("/").pop()!,
      { database },
    ),
  );

  const leftovers = await database.query(
    `
      select
        (select count(*) from signers where envelope_id = $1) +
        (select count(*) from audit_events where envelope_id = $1) +
        (select count(*) from fields where envelope_id = $1) as n
    `,
    [sent.documentId],
  );

  assert.equal(Number(leftovers.rows[0].n), 0);

  const audit = await database.query(
    `select metadata from system_audit_events
     where event = 'documents_erased' and actor_user_id = $1`,
    [owner.user.id],
  );

  assert.equal(audit.rows.length, 1);
  assert.deepEqual(audit.rows[0].metadata.documentIds, [sent.documentId]);
});

test("erasing a business deletes all of its documents and nobody else's", async () => {
  const owner = await principal();
  const leaving = [
    await send(owner, "casa-sai"),
    await send(owner, "casa-sai"),
  ];
  const staying = await send(owner, "casa-fica");

  const result = await eraseDocuments(
    owner,
    { companyRef: "casa-sai" },
    context,
    database,
  );

  assert.equal(result.deleted, 2);
  assert.deepEqual(
    [...result.documentIds].sort(),
    leaving.map((doc) => doc.documentId).sort(),
  );
  assert.equal(
    (await getApiDocument(owner, staying.documentId, database)).status,
    "sent",
  );

  // Nothing left to erase is not an error.
  assert.deepEqual(
    await eraseDocuments(owner, { companyRef: "casa-sai" }, context, database),
    { deleted: 0, documentIds: [], failed: [] },
  );
});
