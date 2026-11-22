import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDeadline } from "../envelope-deadline.ts";
import { formatMessage } from "./format.ts";
import { enMessages } from "./locales/en.ts";
import { idMessages } from "./locales/id.ts";
import { getMessages } from "./messages.ts";
import { isLocale, localeFromAcceptLanguage } from "./types.ts";

function messageKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

test("Accept-Language picks the first supported language", () => {
  assert.equal(localeFromAcceptLanguage("id-ID,id;q=0.9,en;q=0.8"), "id");
  assert.equal(localeFromAcceptLanguage("en-GB,en;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage("fr-FR,fr;q=0.9"), null);
  assert.equal(localeFromAcceptLanguage(null), null);
});

test("only en and id are locales", () => {
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("id"), true);
  assert.equal(isLocale("en-US"), false);
  assert.equal(isLocale(undefined), false);
});

test("the Indonesian dictionary has the same keys as English", () => {
  assert.deepEqual(
    messageKeys(idMessages).sort(),
    messageKeys(enMessages).sort(),
  );
});

test("no dictionary message is left empty", () => {
  for (const [locale, dictionary] of [
    ["en", enMessages],
    ["id", idMessages],
  ] as const) {
    for (const key of messageKeys(dictionary)) {
      const value = key
        .split(".")
        .reduce<unknown>(
          (current, part) =>
            typeof current === "object" && current !== null
              ? (current as Record<string, unknown>)[part]
              : undefined,
          dictionary,
        );

      assert.equal(typeof value, "string", `missing ${locale} message ${key}`);
      assert.notEqual(value, "", `empty ${locale} message ${key}`);
    }
  }
});

test("the active locale selects its dictionary", () => {
  assert.equal(getMessages("en"), enMessages);
  assert.equal(getMessages("id"), idMessages);
  assert.equal(getMessages(), enMessages);
});

test("deadlines are formatted in the active language, always in UTC", () => {
  assert.match(formatDeadline(1_800_000_000), /January/);
  assert.match(formatDeadline(1_800_000_000, "id"), /Januari/);
  assert.match(formatDeadline(1_800_000_000, "id"), /UTC$/);
});

test("formatMessage replaces named placeholders", () => {
  assert.equal(
    formatMessage("Hi {name}, you have {count} messages.", {
      count: 2,
      name: "Rina",
    }),
    "Hi Rina, you have 2 messages.",
  );
  assert.equal(
    formatMessage("Keep {unknown} visible."),
    "Keep {unknown} visible.",
  );
});

test("the privacy notice uses Indonesian law and names its processors", () => {
  const en = enMessages.legal.privacy.sections;
  const id = idMessages.legal.privacy.sections;

  assert.match(en.recipients.items.join(" "), /Resend/);
  assert.match(id.recipients.items.join(" "), /Resend/);
  assert.match(en.incidents.paragraphs.join(" "), /3 × 24 hours/);
  assert.match(id.incidents.paragraphs.join(" "), /3 × 24 jam/);
  assert.match(en.rights.intro, /PDP Law/);
  assert.match(id.rights.intro, /UU PDP/);
  assert.match(en.requests.paragraphs.join(" "), /30 days/);
  assert.match(id.requests.paragraphs.join(" "), /30 hari/);
  assert.match(en.children.paragraphs.join(" "), /18 years/);
  assert.match(id.children.paragraphs.join(" "), /18 \(delapan belas\) tahun/);
});

test("the accessibility statement stays candid and cites Indonesian law", () => {
  const en = enMessages.legal.accessibility.sections;
  const id = idMessages.legal.accessibility.sections;

  assert.match(en.standards.paragraphs.join(" "), /UU No\. 8 of 2016/);
  assert.match(id.standards.paragraphs.join(" "), /UU Nomor 8 Tahun 2016/);
  assert.match(en.standards.paragraphs.join(" "), /do not claim/);
  assert.match(id.standards.paragraphs.join(" "), /tidak menyatakan/);
  assert.match(en.limitations.items.join(" "), /canvas/);
  assert.match(id.limitations.items.join(" "), /canvas/);
});

test("the contact form and its errors are available in both languages", () => {
  const en = enMessages.contact.form;
  const id = idMessages.contact.form;

  assert.match(en.submit, /Send message/);
  assert.match(id.submit, /Kirim pesan/);
  assert.match(en.success, /\{email\}/);
  assert.match(id.success, /\{email\}/);
  assert.match(en.errors.reviewFields, /highlighted fields/);
  assert.match(id.errors.reviewFields, /kolom yang ditandai/);
});

test("the dashboard has translated copy in both languages", () => {
  const en = enMessages.dashboard;
  const id = idMessages.dashboard;

  assert.equal(en.header.title, "Documents");
  assert.equal(id.header.title, "Dokumen");
  assert.equal(en.filters.All, "All");
  assert.equal(id.filters.All, "Semua");
  assert.equal(en.upload, "Upload a PDF");
  assert.equal(id.upload, "Unggah PDF");
  assert.match(en.showing, /\{shown\}.*\{total\}/);
  assert.match(id.showing, /\{shown\}.*\{total\}/);

  for (const copy of [en, id]) {
    assert.match(copy.search, /\.\.\.$/);
    assert.equal(Object.keys(copy.card.statuses).length, 7);
    assert.match(copy.card.status, /\{status\}/);
  }
});

test("the templates surface has translated copy in both languages", () => {
  const en = enMessages.templates;
  const id = idMessages.templates;

  assert.equal(en.header.title, "Templates");
  assert.equal(id.header.title, "Template");
  assert.equal(en.delete.confirm, "Delete template");
  assert.equal(id.delete.confirm, "Hapus template");
  assert.equal(en.sendToMany, "Send to many");
  assert.equal(id.sendToMany, "Kirim massal");

  for (const copy of [en, id]) {
    assert.match(copy.card.meta, /\{pageCount\}.*\{fieldCount\}.*\{saved\}/);
    assert.match(copy.card.roleAriaLabel, /\{templateName\}/);
    assert.match(copy.delete.description.removed, /\{templateName\}/);
    assert.match(copy.delete.triggerAriaLabel, /\{templateName\}/);
  }
});

test("the settings panels have translated copy in both languages", () => {
  const en = enMessages.settings;
  const id = idMessages.settings;

  assert.equal(en.organization.header.title, "Organization");
  assert.equal(id.organization.header.title, "Organisasi");
  assert.equal(en.apiKeys.header.title, "API keys");
  assert.equal(id.apiKeys.header.title, "Kunci API");
  assert.equal(en.webhooks.title, "Webhooks");
  assert.equal(id.webhooks.title, "Webhook");
  assert.equal(en.twoFactor.title, "Two-step sign-in");
  assert.equal(id.twoFactor.title, "Masuk dua langkah");
  assert.equal(en.people.title, "People");
  assert.equal(id.people.title, "Orang");
  assert.equal(en.updates.howTo.title, "How to update");
  assert.equal(id.updates.howTo.title, "Cara memperbarui");

  for (const copy of [en, id]) {
    assert.equal(Object.keys(copy.apiKeys.status).length, 4);
    assert.match(copy.apiKeys.list.loadError, /\{error\}/);
    assert.match(copy.apiKeys.list.meta.madeBy, /\{ownerName\}.*\{date\}/);
    assert.match(copy.apiKeys.revoke.ariaLabel, /\{name\}/);
    assert.match(copy.webhooks.log.attempts, /\{count\}/);
    assert.match(copy.webhooks.newSecretNotice, /\{url\}/);
    assert.match(copy.twoFactor.backupCodes.fileTitle, /\{productName\}/);
    assert.match(copy.people.confirmIdentity.ariaLabel, /\{name\}/);
    assert.match(copy.people.pagination, /\{shown\}.*\{total\}/);
    assert.match(copy.updates.latest, /\{current\}/);
    assert.match(copy.updates.upToDate, /\{version\}/);
  }

  for (const event of Object.keys(en.webhooks.eventLabels)) {
    assert.ok(
      event in id.webhooks.eventLabels,
      `missing ${event} in Indonesian`,
    );
  }
});

test("the permitted-use page uses the current name and covers Indonesia", () => {
  const en = enMessages.permittedUse;
  const id = idMessages.permittedUse;

  for (const copy of [en, id]) {
    const text = JSON.stringify(copy);

    assert.doesNotMatch(text, /Signudoc/i);
    assert.match(copy.hero.description, /\{platformName\}/);
    assert.match(copy.sections.whatItIsNot.heading, /\{platformName\}/);
  }

  assert.match(en.sections.indonesia.paragraphs.join(" "), /UU ITE/);
  assert.match(id.sections.indonesia.paragraphs.join(" "), /UU ITE/);
  assert.match(
    id.sections.indonesia.paragraphs.join(" "),
    /Penyelenggara Sertifikat Elektronik/,
  );
  assert.match(id.sections.whatItIsNot.items.join(" "), /terkualifikasi/);
});
