// The business branding and Brazilian Portuguese, end to end against a real
// Postgres. The whole file runs with NEXT_PUBLIC_APP_LOCALE=pt-BR, set before
// anything that reads it is imported (some of it reads it once, on load).
// Run with `npm run test:db`.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PDFDocument } from "pdf-lib";
import type pg from "pg";

process.env.NEXT_PUBLIC_APP_LOCALE = "pt-BR";

const { openTestDatabase } = await import("../db/test-database.ts");
const { ELECTRONIC_RECORDS_DISCLOSURE_VERSION, CONSENT_STATEMENT } =
  await import("../electronic-records-disclosure.ts");
const {
  getSigningPayloadForToken,
  recordSignerConsent,
  submitSigningForToken,
} = await import("../signing.ts");
const { getSenderEnvelopeDownload } = await import("../downloads.ts");
const { createStorageService } = await import("../services/storage.ts");
const { ApiDocumentError, createApiDocument, createApiDocumentSchema } =
  await import("./api-documents.ts");
const { authenticateApiKey, createApiKey } = await import("./api-keys.ts");
const {
  applyDocumentBranding,
  documentLogoPath,
  getDocumentBranding,
  getDocumentBrandingForToken,
} = await import("./document-branding.ts");
const { PORTUGUESE_DISCLOSURE_VERSION } = await import("./disclosure-pt-br.ts");

type Principal = NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>;

let database: pg.Pool;
let workDir: string;
const createdUsers: string[] = [];
const context = { ipAddress: "203.0.113.5", userAgent: "petsky-test" };

// The smallest valid PNG: one transparent pixel.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

before(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "petskysign-branding-"));
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

async function principal(): Promise<Principal> {
  const userId = randomUUID();

  createdUsers.push(userId);
  await database.query(
    `
      insert into public."user" (id, name, email, "emailVerified", role)
      values ($1, 'Petsky Integração', $2, true, 'user')
    `,
    [userId, `${userId}@example.test`],
  );

  const key = await createApiKey({ name: "t", userId }, database);
  const found = await authenticateApiKey(key.key, database);

  assert.ok(found);
  return found;
}

async function send(owner: Principal, branding: Record<string, unknown>) {
  const pdf = await PDFDocument.create();

  pdf.addPage([595, 842]);

  return createApiDocument(
    owner,
    createApiDocumentSchema.parse({
      branding,
      permittedUseConfirmed: true,
      signer: { name: "Maria Tutora" },
      title: "Contrato de creche",
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

function tokenOf(link: string) {
  return new URL(link).pathname.split("/").pop()!;
}

test("the business is the sender the signer sees, in Portuguese", async () => {
  const owner = await principal();
  const sent = await send(owner, {
    color: "#1F7A5A",
    contact: "(11) 99999-0000",
    logo: { contentBase64: PNG_BASE64 },
    name: "Creche Patinhas",
  });
  const token = tokenOf(sent.signLink!);
  const payload = await getSigningPayloadForToken(token, { database });

  assert.equal(payload.senderName, "Creche Patinhas");
  assert.equal(payload.disclosure.version, PORTUGUESE_DISCLOSURE_VERSION);
  assert.equal(payload.disclosure.statement, CONSENT_STATEMENT);
  assert.match(payload.disclosure.statement, /^Li o termo acima/);

  const text = payload.disclosure.sections.map((s) => s.text).join("\n");

  assert.match(text, /Creche Patinhas pede que você receba/);
  assert.match(text, /Creche Patinhas \(\(11\) 99999-0000\)/);
  assert.match(text, /LGPD/);
  assert.doesNotMatch(text, /Petsky Integração/);

  const stored = await getDocumentBranding(sent.documentId, database);

  assert.equal(stored?.name, "Creche Patinhas");
  assert.equal(stored?.color, "#1f7a5a");
  assert.match(stored?.logoKey ?? "", /^document-logos\/[0-9a-f]{64}\.png$/);

  const logo = await createStorageService().getObject(stored!.logoKey!);

  assert.equal(Buffer.from(logo.body).toString("base64"), PNG_BASE64);

  // The pages for a link that stopped working find the same business.
  assert.equal(
    (await getDocumentBrandingForToken(token, database))?.envelopeId,
    sent.documentId,
  );

  const branding = applyDocumentBranding(
    {
      brandColor: "#5340d6",
      contactUrl: null,
      hosted: false,
      logoUrl: "/api/brand/logo?v=1",
      organizationName: "Petsky",
      privacyUrl: null,
      productName: "Petsky",
      signupAvailable: false,
      supportAddress: "suporte@petsky.test",
      termsUrl: null,
    },
    stored,
  );

  assert.equal(branding.productName, "Creche Patinhas");
  assert.equal(branding.brandColor, "#1f7a5a");
  assert.equal(branding.logoUrl, documentLogoPath(sent.documentId));
  assert.equal(branding.supportAddress, "(11) 99999-0000");
});

test("signing in Portuguese records the Portuguese consent and a Portuguese certificate", async () => {
  const owner = await principal();
  const sent = await send(owner, { name: "Hotel Au Au" });
  const token = tokenOf(sent.signLink!);
  const payload = await getSigningPayloadForToken(token, { database });
  const field = payload.currentSignerFields.find((f) => f.type === "signature");

  assert.ok(field);
  await recordSignerConsent(
    token,
    { disclosureVersion: ELECTRONIC_RECORDS_DISCLOSURE_VERSION },
    { database },
  );

  // The English version is refused: the signer must agree to what they saw.
  await assert.rejects(
    recordSignerConsent(
      token,
      { disclosureVersion: "2026-11-13" },
      { database },
    ),
  );

  const consent = await database.query(
    `select metadata from audit_events where envelope_id = $1 and event = 'consented'`,
    [sent.documentId],
  );

  assert.equal(
    consent.rows[0].metadata.disclosureVersion,
    PORTUGUESE_DISCLOSURE_VERSION,
  );
  assert.match(consent.rows[0].metadata.statement, /^Li o termo acima/);

  const result = await submitSigningForToken(
    token,
    {
      clientTimezoneOffsetMinutes: 180,
      fields: [
        {
          fieldId: field.id,
          inputMethod: "typed",
          type: "signature",
          value: "Maria Tutora",
        },
      ],
    },
    { database },
  );

  // The signer is told the business sent it; the account's own email keeps
  // the account's name.
  const { readdir, readFile } = await import("node:fs/promises");
  const outbox = process.env.EMAIL_CAPTURE_DIR!;
  const messages = await Promise.all(
    (await readdir(outbox).catch(() => [] as string[])).map(async (file) =>
      JSON.parse(await readFile(path.join(outbox, file), "utf8")),
    ),
  );
  const toOwner = messages.filter((message) =>
    [message.to].flat().includes(owner.user.email),
  );

  assert.ok(toOwner.length > 0);
  for (const message of toOwner) {
    assert.doesNotMatch(String(message.text ?? ""), /Hi Hotel Au Au/);
    assert.match(String(message.text ?? ""), /Petsky Integração/);
  }

  // The done page is told which document it was, for its branding.
  assert.match(result.redirectPath, new RegExp(`[?&]d=${sent.documentId}`));

  const download = await getSenderEnvelopeDownload(
    owner.user.id,
    sent.documentId,
    "evidence",
    { database },
  );
  const bytes =
    "body" in download
      ? download.body
      : (await createStorageService().getObject(download.key)).body;
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getTitle(), "Certificado de auditoria: Contrato de creche");
  // pdf-lib cannot extract text; the certificate's lines are checked through
  // the same tr() the unit tests cover. Here: it was built and sealed.
  assert.ok(bytes.byteLength > 1000);
});

test("a bad color or a file that is not an image is refused before anything is made", async () => {
  const owner = await principal();
  const countEnvelopes = async () =>
    (
      await database.query(
        `select count(*)::int as n from envelopes where user_id = $1`,
        [owner.user.id],
      )
    ).rows[0].n as number;
  const before = await countEnvelopes();

  await assert.rejects(
    send(owner, { color: "green-ish", name: "Casa" }),
    (error: unknown) =>
      error instanceof Error && /branding\.color/.test(error.message),
  );
  await assert.rejects(
    send(owner, {
      logo: { contentBase64: Buffer.from("not an image").toString("base64") },
      name: "Casa",
    }),
    (error: unknown) =>
      error instanceof Error && /branding\.logo/.test(error.message),
  );
  assert.equal(await countEnvelopes(), before);
  assert.ok(ApiDocumentError);
});
