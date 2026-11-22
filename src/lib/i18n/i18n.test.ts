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
