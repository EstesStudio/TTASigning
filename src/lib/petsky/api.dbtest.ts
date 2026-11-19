import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

import { openTestDatabase } from "../db/test-database.ts";
import { ELECTRONIC_RECORDS_DISCLOSURE_VERSION } from "../electronic-records-disclosure.ts";
import { hashOpaqueToken } from "../services/opaque-tokens.ts";
import {
  getSigningPayloadForToken,
  recordSignerConsent,
  submitSigningForToken,
} from "../signing.ts";
import {
  ApiDocumentError,
  cancelApiDocument,
  createApiDocument,
  createApiDocumentSchema,
  getApiDocument,
  issueNewSigningLink,
  remindApiDocument,
} from "./api-documents.ts";
import {
  authenticateApiKey,
  createApiKey,
  readBearerApiKey,
  revokeApiKey,
  type ApiKeyPrincipal,
} from "./api-keys.ts";
import { isPlaceholderEmail } from "./placeholder-email.ts";

// The integration API (/api/v1) against a real Postgres, with files on a
// temporary disk and email captured to a temporary folder.
// Run with `npm run test:db`.

let database: pg.Pool;
let workDir: string;
const createdUsers: string[] = [];
const context = { ipAddress: "203.0.113.7", userAgent: "petsky-test" };

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "petskysign-api-"));
  process.env.APP_URL = "https://assinar.example.test";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = path.join(workDir, "storage");
  process.env.EMAIL_DRIVER = "capture";
  process.env.EMAIL_CAPTURE_DIR = path.join(workDir, "outbox");
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

async function createAccount(verified = true): Promise<string> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `
      insert into public."user" (id, name, email, "emailVerified", role)
      values ($1, 'Petsky Integração', $2, $3, 'user')
    `,
    [userId, `${userId}@example.test`, verified],
  );

  return userId;
}

async function principalFor(userId: string): Promise<ApiKeyPrincipal> {
  const created = await createApiKey({ name: "test", userId }, database);
  const principal = await authenticateApiKey(created.key, database);

  assert.ok(principal);
  return principal;
}

async function makePdf(pages = 2): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  for (let index = 0; index < pages; index += 1) {
    pdf
      .addPage([595, 842])
      .drawText(`Contrato de creche, pagina ${index + 1}`, {
        x: 50,
        y: 780,
      });
  }

  return pdf.save();
}

async function sendLinkDocument(
  principal: ApiKeyPrincipal,
  overrides: Record<string, unknown> = {},
) {
  return createApiDocument(
    principal,
    createApiDocumentSchema.parse({
      companyRef: "casa-123",
      externalRef: `contrato-${randomUUID()}`,
      permittedUseConfirmed: true,
      signer: { channel: "link", name: "Tutor Teste" },
      title: "Contrato de creche",
      ...overrides,
    }),
    {
      body: await makePdf(),
      contentType: "application/pdf",
      filename: "c.pdf",
    },
    context,
    database,
  );
}

function tokenFromLink(link: string): string {
  return new URL(link).pathname.split("/").pop()!;
}

async function signWithToken(token: string) {
  const page = await getSigningPayloadForToken(token, { database });
  const signature = page.currentSignerFields.find(
    (field) => field.type === "signature",
  );

  assert.ok(signature);
  await recordSignerConsent(
    token,
    { disclosureVersion: ELECTRONIC_RECORDS_DISCLOSURE_VERSION },
    { database },
  );
  await submitSigningForToken(
    token,
    {
      clientTimezoneOffsetMinutes: 180,
      fields: [
        {
          fieldId: signature.id,
          inputMethod: "typed",
          type: "signature",
          value: "Tutor Teste",
        },
      ],
    },
    { database },
  );
}

test("a key authenticates as its account until it is revoked", async () => {
  const userId = await createAccount();
  const created = await createApiKey({ name: "prod", userId }, database);

  assert.match(created.key, /^psk_/);
  assert.equal(
    readBearerApiKey(new Headers({ authorization: `Bearer ${created.key}` })),
    created.key,
  );
  assert.equal(
    readBearerApiKey(new Headers({ authorization: "Bearer x" })),
    null,
  );

  const principal = await authenticateApiKey(created.key, database);

  assert.equal(principal?.user.id, userId);
  assert.equal(await authenticateApiKey(`${created.key}x`, database), null);

  const stored = await database.query(
    `select key_hash from api_keys where id = $1`,
    [created.id],
  );

  assert.notEqual(stored.rows[0].key_hash, created.key);

  assert.equal(await revokeApiKey(created.id, database), true);
  assert.equal(await authenticateApiKey(created.key, database), null);
});

test("a key of an account with an unverified email is refused", async () => {
  const userId = await createAccount(false);
  const created = await createApiKey({ name: "x", userId }, database);

  assert.equal(await authenticateApiKey(created.key, database), null);
});

test("a link document is sent without email and signed by its link", async () => {
  const principal = await principalFor(await createAccount());
  const sent = await sendLinkDocument(principal);

  assert.equal(sent.status, "sent");
  assert.ok(sent.signLink?.startsWith("https://assinar.example.test/sign/"));

  const envelope = await database.query(
    `select delivery_channel, company_ref, api_key_id, reminder_interval_days
     from envelopes where id = $1`,
    [sent.documentId],
  );

  assert.equal(envelope.rows[0].delivery_channel, "link");
  assert.equal(envelope.rows[0].company_ref, "casa-123");
  assert.equal(envelope.rows[0].api_key_id, principal.keyId);
  assert.equal(envelope.rows[0].reminder_interval_days, null);

  const signer = await database.query(
    `select email from signers where id = $1`,
    [sent.signerId],
  );

  assert.ok(isPlaceholderEmail(signer.rows[0].email));

  // The signature box went to the last page by default.
  const field = await database.query(
    `select page, type from fields where signer_id = $1`,
    [sent.signerId],
  );

  assert.deepEqual(field.rows, [{ page: 2, type: "signature" }]);

  let status = await getApiDocument(principal, sent.documentId, database);

  assert.equal(status.status, "sent");
  assert.equal(status.channel, "link");
  assert.equal(status.signers[0]?.status, "sent");
  assert.equal(status.signers[0]?.email, null);

  await signWithToken(tokenFromLink(sent.signLink!));

  status = await getApiDocument(principal, sent.documentId, database);
  assert.equal(status.status, "completed");
  assert.equal(status.signers[0]?.status, "signed");
  assert.ok(status.signers[0]?.viewedAt);
  assert.ok(status.signers[0]?.consentedAt);
  assert.ok(status.completedAt);

  // Nothing was emailed to the signer, and the audit trail says nothing was.
  const emailed = await database.query(
    `select metadata from audit_events where envelope_id = $1 and event = 'email_sent'`,
    [sent.documentId],
  );

  assert.ok(
    emailed.rows.every(
      (row: { metadata: { recipient?: string } }) =>
        !isPlaceholderEmail(row.metadata.recipient),
    ),
  );

  const outbox = await readdir(process.env.EMAIL_CAPTURE_DIR!).catch(
    () => [] as string[],
  );

  for (const file of outbox) {
    const message = JSON.parse(
      await readFile(path.join(process.env.EMAIL_CAPTURE_DIR!, file), "utf8"),
    ) as { to: string | string[] };

    assert.ok(![message.to].flat().some((to) => isPlaceholderEmail(to)));
  }

  await assert.rejects(
    issueNewSigningLink(principal, sent.documentId, context, database),
    (error: unknown) =>
      error instanceof ApiDocumentError && error.statusCode === 409,
  );
});

test("a new link replaces the old one", async () => {
  const principal = await principalFor(await createAccount());
  const sent = await sendLinkDocument(principal);
  const reminded = await remindApiDocument(
    principal,
    sent.documentId,
    context,
    database,
  );

  assert.equal(reminded.channel, "link");
  assert.ok(reminded.signLink);
  assert.notEqual(reminded.signLink, sent.signLink);

  const stored = await database.query(
    `select signing_token_hash from signers where id = $1`,
    [sent.signerId],
  );

  assert.equal(
    stored.rows[0].signing_token_hash,
    hashOpaqueToken(tokenFromLink(reminded.signLink)),
  );

  await assert.rejects(
    getSigningPayloadForToken(tokenFromLink(sent.signLink!), { database }),
  );

  const audit = await database.query(
    `select count(*)::int as n from audit_events where envelope_id = $1 and event = 'reminded_manual'`,
    [sent.documentId],
  );

  assert.equal(audit.rows[0].n, 1);
});

test("a cancelled document stops accepting its link, and cancelling twice is fine", async () => {
  const principal = await principalFor(await createAccount());
  const sent = await sendLinkDocument(principal);

  const first = await cancelApiDocument(
    principal,
    sent.documentId,
    "Contrato refeito",
    context,
    database,
  );

  assert.ok(first.voidedAt);
  assert.deepEqual(
    await cancelApiDocument(
      principal,
      sent.documentId,
      null,
      context,
      database,
    ),
    first,
  );
  assert.equal(
    (await getApiDocument(principal, sent.documentId, database)).status,
    "voided",
  );
  await assert.rejects(signWithToken(tokenFromLink(sent.signLink!)));
});

test("another account's key cannot see or change a document", async () => {
  const owner = await principalFor(await createAccount());
  const stranger = await principalFor(await createAccount());
  const sent = await sendLinkDocument(owner);
  const notFound = (error: unknown) =>
    error instanceof ApiDocumentError && error.statusCode === 404;

  await assert.rejects(
    getApiDocument(stranger, sent.documentId, database),
    notFound,
  );
  await assert.rejects(
    issueNewSigningLink(stranger, sent.documentId, context, database),
    notFound,
  );
  await assert.rejects(
    cancelApiDocument(stranger, sent.documentId, null, context, database),
    notFound,
  );
  await assert.rejects(getApiDocument(owner, "not-a-uuid", database), notFound);
});

test("placement, page and channel rules are checked before anything is made", async () => {
  const principal = await principalFor(await createAccount());

  assert.throws(() =>
    createApiDocumentSchema.parse({
      permittedUseConfirmed: true,
      signer: { channel: "email", name: "Sem Email" },
      title: "x",
    }),
  );
  assert.throws(() =>
    createApiDocumentSchema.parse({
      signer: { name: "Sem Confirmar" },
      title: "x",
    }),
  );
  assert.throws(() =>
    createApiDocumentSchema.parse({
      fields: [{ height: 0.1, page: 1, type: "name", width: 0.1, x: 0, y: 0 }],
      permittedUseConfirmed: true,
      signer: { name: "Sem Assinatura" },
      title: "x",
    }),
  );

  const before = await database.query(
    `select count(*)::int as n from envelopes where user_id = $1`,
    [principal.user.id],
  );

  await assert.rejects(
    sendLinkDocument(principal, {
      fields: [
        { height: 0.1, page: 9, type: "signature", width: 0.3, x: 0.1, y: 0.1 },
      ],
    }),
    (error: unknown) =>
      error instanceof ApiDocumentError && error.statusCode === 400,
  );

  const afterward = await database.query(
    `select count(*)::int as n from envelopes where user_id = $1`,
    [principal.user.id],
  );

  // The draft made for the refused request was removed.
  assert.equal(afterward.rows[0].n, before.rows[0].n);
});

test("an email document is invited by email and can carry automatic reminders", async () => {
  const principal = await principalFor(await createAccount());
  const signerEmail = `${randomUUID()}@example.test`;
  const sent = await sendLinkDocument(principal, {
    reminderIntervalDays: 3,
    signer: { channel: "email", email: signerEmail, name: "Tutor Email" },
  });

  assert.equal(sent.signLink, null);

  const invited = await database.query(
    `select count(*)::int as n from audit_events
     where envelope_id = $1 and event = 'email_sent' and metadata->>'recipient' = $2`,
    [sent.documentId, signerEmail],
  );

  assert.equal(invited.rows[0].n, 1);

  const status = await getApiDocument(principal, sent.documentId, database);

  assert.equal(status.channel, "email");
  assert.equal(status.signers[0]?.email, signerEmail);
});
