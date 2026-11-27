import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSignerPrivacyNotice,
  buildSignerPrivacyProcessorsText,
  resolveSignerPrivacyDeployment,
  resolveSignerPrivacyPage,
  type SignerPrivacySettings,
} from "./signer-privacy.ts";

const baseSettings: SignerPrivacySettings = {
  hosted: false,
  organizationName: "Acme Documents",
  privacyUrl: null,
  retentionDays: null,
  supportAddress: "help@example.test",
};

test("resolveSignerPrivacyDeployment detects hosting and storage combinations", () => {
  assert.deepEqual(resolveSignerPrivacyDeployment({}), {
    hosting: "self-hosted",
    storage: "local",
  });
  assert.deepEqual(
    resolveSignerPrivacyDeployment({ STORAGE_DRIVER: "local" }),
    {
      hosting: "self-hosted",
      storage: "local",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
      STORAGE_DRIVER: "local",
    }),
    {
      hosting: "self-hosted",
      storage: "local",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
    }),
    {
      hosting: "self-hosted",
      storage: "blob",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({ BLOB_STORE_ID: "store_123" }),
    {
      hosting: "self-hosted",
      storage: "blob",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({ STORAGE_DRIVER: " Blob " }),
    {
      hosting: "self-hosted",
      storage: "blob",
    },
  );
  assert.deepEqual(resolveSignerPrivacyDeployment({ VERCEL: "1" }), {
    hosting: "vercel",
    storage: "blob",
  });
  assert.deepEqual(
    resolveSignerPrivacyDeployment({
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
      VERCEL: "1",
    }),
    {
      hosting: "vercel",
      storage: "blob",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({ STORAGE_DRIVER: "local", VERCEL: "1" }),
    {
      hosting: "vercel",
      storage: "local",
    },
  );
});

test("resolveSignerPrivacyDeployment falls back cleanly when STORAGE_DRIVER is unrecognized", () => {
  assert.deepEqual(resolveSignerPrivacyDeployment({ STORAGE_DRIVER: "r2" }), {
    hosting: "self-hosted",
    storage: "local",
  });
  assert.deepEqual(
    resolveSignerPrivacyDeployment({
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
      STORAGE_DRIVER: "r2",
    }),
    {
      hosting: "self-hosted",
      storage: "blob",
    },
  );
  assert.deepEqual(
    resolveSignerPrivacyDeployment({ STORAGE_DRIVER: "r2", VERCEL: "1" }),
    {
      hosting: "vercel",
      storage: "blob",
    },
  );
});

test("self-hosted local-storage notice describes the organization's own host and storage without naming Vercel or Neon", () => {
  const notice = buildSignerPrivacyNotice(baseSettings, {});

  assert.deepEqual(notice.deployment, {
    hosting: "self-hosted",
    storage: "local",
  });
  assert.equal(notice.organizationSubject, "Acme Documents");
  assert.deepEqual(notice.contact, {
    address: "help@example.test",
    href: "mailto:help@example.test",
  });
  assert.doesNotMatch(notice.processors, /Vercel|Neon/);
  assert.match(
    notice.processors,
    /Acme Documents hosts this site and stores documents on its own storage alongside its database/,
  );
  assert.match(notice.processors, /email provider \(Resend\)/);
  assert.match(
    notice.processors,
    /process your information for Acme Documents/,
  );
  assert.match(notice.processors, /EU-US Data Privacy Framework/);

  // Explicit STORAGE_DRIVER=local still avoids Vercel Blob even if Blob creds exist.
  const explicitLocal = buildSignerPrivacyNotice(baseSettings, {
    BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
    STORAGE_DRIVER: "local",
  });

  assert.equal(explicitLocal.processors, notice.processors);
});

test("self-hosted notice with Vercel Blob names Vercel Blob for storage but not Vercel as host", () => {
  const notice = buildSignerPrivacyNotice(baseSettings, {
    BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret",
  });

  assert.deepEqual(notice.deployment, {
    hosting: "self-hosted",
    storage: "blob",
  });
  assert.doesNotMatch(notice.processors, /hosting provider \(Vercel\)|Neon/);
  assert.match(
    notice.processors,
    /Acme Documents hosts this site alongside its database/,
  );
  assert.match(notice.processors, /file storage \(Vercel Blob\)/);
  assert.match(notice.processors, /email provider \(Resend\)/);
  assert.match(
    notice.processors,
    /process your information for Acme Documents/,
  );
});

test("Vercel + Vercel Blob notice names Vercel, Neon, Vercel Blob and Resend", () => {
  const notice = buildSignerPrivacyNotice(baseSettings, { VERCEL: "1" });

  assert.deepEqual(notice.deployment, {
    hosting: "vercel",
    storage: "blob",
  });
  assert.match(notice.processors, /process it for Acme Documents:/);
  assert.match(notice.processors, /hosting provider \(Vercel\)/);
  assert.match(notice.processors, /database provider \(such as Neon\)/);
  assert.match(notice.processors, /file storage \(Vercel Blob\)/);
  assert.match(notice.processors, /email provider \(Resend\)/);
});

test("Vercel deployment with explicit STORAGE_DRIVER=local does not attribute storage to Vercel Blob", () => {
  const text = buildSignerPrivacyProcessorsText("Acme Documents", {
    hosting: "vercel",
    storage: "local",
  });

  assert.match(text, /hosting provider \(Vercel\)/);
  assert.doesNotMatch(text, /Vercel Blob/);
  assert.match(text, /configured file storage/);
});

test("blank or unset organization name reads grammatically across all deployment combinations", () => {
  for (const env of [
    {},
    { BLOB_STORE_ID: "store_123" },
    { VERCEL: "1" },
  ] as const) {
    const notice = buildSignerPrivacyNotice(
      { ...baseSettings, organizationName: "   " },
      env,
    );

    assert.equal(
      notice.organizationSubject,
      "The organization that runs this site",
    );
    assert.equal(
      notice.organizationObject,
      "the organization that runs this site",
    );
    assert.match(
      notice.description,
      /^The organization that runs this site uses this site/,
    );
    assert.match(
      notice.rights,
      /^You can ask the organization that runs this site for a copy/,
    );
    assert.doesNotMatch(notice.processors, /runs this site hosts this site/);
    assert.doesNotMatch(notice.processors, /for The organization/);
  }

  const localUnnamed = buildSignerPrivacyNotice(
    { ...baseSettings, organizationName: null },
    {},
  );
  assert.doesNotMatch(localUnnamed.processors, /Vercel|Neon/);
  assert.match(
    localUnnamed.processors,
    /The organization that runs this site hosts it and stores documents on its own storage alongside its database/,
  );
  assert.match(localUnnamed.processors, /process your information for it\./);

  const blobUnnamed = buildSignerPrivacyNotice(
    { ...baseSettings, organizationName: null },
    { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_secret" },
  );
  assert.doesNotMatch(blobUnnamed.processors, /hosting provider \(Vercel\)/);
  assert.match(
    blobUnnamed.processors,
    /The organization that runs this site hosts it alongside its database/,
  );
  assert.match(blobUnnamed.processors, /file storage \(Vercel Blob\)/);
  assert.match(blobUnnamed.processors, /process your information for it\./);
});

test("resolveSignerPrivacyPage redirects in hosted mode and when a custom privacy URL is set", () => {
  assert.deepEqual(
    resolveSignerPrivacyPage(baseSettings, { HOSTED_MODE: "1" }),
    { destination: "/privacy", kind: "redirect" },
  );
  assert.deepEqual(
    resolveSignerPrivacyPage(
      { ...baseSettings, privacyUrl: "https://example.org/privacy" },
      { HOSTED_MODE: "true" },
    ),
    { destination: "/privacy", kind: "redirect" },
  );
  assert.deepEqual(
    resolveSignerPrivacyPage({ ...baseSettings, hosted: true }, {}),
    { destination: "/privacy", kind: "redirect" },
  );
  assert.deepEqual(
    resolveSignerPrivacyPage(
      { ...baseSettings, privacyUrl: " https://example.org/privacy " },
      {},
    ),
    { destination: "https://example.org/privacy", kind: "redirect" },
  );

  const resolved = resolveSignerPrivacyPage(
    { ...baseSettings, privacyUrl: "   " },
    {},
  );
  assert.equal(resolved.kind, "notice");
  assert.doesNotMatch(resolved.notice.processors, /Vercel/);
});

test("buildSignerPrivacyNotice formats retention and support contact from settings", () => {
  const timed = buildSignerPrivacyNotice(
    {
      ...baseSettings,
      retentionDays: 90,
      supportAddress: "Acme Support <support@acme.example>",
    },
    {},
  );

  assert.equal(
    timed.retention,
    "Finished documents and their audit trails are deleted 90 days after they are finished.",
  );
  assert.deepEqual(timed.contact, {
    address: "support@acme.example",
    href: "mailto:support@acme.example",
  });

  const indefinite = buildSignerPrivacyNotice(
    { ...baseSettings, retentionDays: null, supportAddress: null },
    {},
  );

  assert.match(
    indefinite.retention,
    /kept until the organization deletes them/,
  );
  assert.equal(indefinite.contact, null);
});
