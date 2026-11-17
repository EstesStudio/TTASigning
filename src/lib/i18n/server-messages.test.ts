import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  accountClosureConfirmationPhrases,
  accountClosureRequestSchema,
} from "../schemas/auth.ts";
import { EnvelopeDeadlinePassedError } from "../envelope-deadline.ts";
import { signerListSchema } from "../schemas/signer.ts";
import { SigningAccessError, SigningMutationError } from "../signing.ts";
import {
  inEnglish,
  serverMessages,
  translateMessage,
} from "./server-messages.ts";

test("a signing error keeps its English message and reads in French", () => {
  const error = new SigningMutationError((m) => m.signing.codeWrong, 400);

  assert.equal(error.message, "That code is not right.");
  assert.equal(translateMessage(error, "en"), "That code is not right.");
  assert.equal(translateMessage(error, "fr"), "Ce code n’est pas correct.");
});

test("an expired link is explained in French", () => {
  const error = new SigningAccessError("expired");

  assert.equal(error.message, "This link has expired.");
  assert.equal(translateMessage(error, "fr"), "Ce lien a expiré.");
});

test("the tries left before a lock are counted in each language", () => {
  const message = (left: number) =>
    new SigningMutationError((m) => m.signing.wrongCredentials(left), 400);

  assert.equal(
    message(1).message,
    "That email address or password is not right. 1 try is left before the account is locked for signing.",
  );
  assert.equal(
    translateMessage(message(1), "fr"),
    "Adresse e-mail ou mot de passe incorrect. Il vous reste 1 essai avant le blocage du compte pour la signature.",
  );
  assert.equal(
    translateMessage(message(3), "fr"),
    "Adresse e-mail ou mot de passe incorrect. Il vous reste 3 essais avant le blocage du compte pour la signature.",
  );
});

test("a passed deadline is dated in the reader's language", () => {
  const error = new EnvelopeDeadlinePassedError(1_800_000_000);

  assert.match(
    error.message,
    /^This request expired on .+\. Set a new deadline first\.$/,
  );
  assert.match(
    translateMessage(error, "fr"),
    /^Cette demande a expiré le 15 janvier 2027 .+\. Définissez d’abord une nouvelle date limite\.$/,
  );
});

test("a schema problem is found by its English text", () => {
  const result = signerListSchema.safeParse([
    { email: "paul@example.com", name: "Paul" },
    { email: "paul@example.com", name: "Paul Durand" },
  ]);

  assert.equal(result.success, false);
  const message = result.error.issues[0]?.message ?? "";

  assert.equal(translateMessage(message, "en"), message);
  assert.equal(
    translateMessage(message, "fr"),
    "Chaque signataire doit avoir une adresse e-mail différente.",
  );
});

test("an account closes with the phrase of either language", () => {
  assert.equal(accountClosureConfirmationPhrases.fr, "fermer mon compte");

  for (const confirmation of ["close my account", "fermer mon compte"]) {
    assert.ok(accountClosureRequestSchema.safeParse({ confirmation }).success);
  }

  assert.equal(
    accountClosureRequestSchema.safeParse({ confirmation: "fermer" }).success,
    false,
  );
});

test("text that is not a known message is kept as it is", () => {
  assert.equal(translateMessage("Something else.", "fr"), "Something else.");
  assert.equal(inEnglish("Something else."), "Something else.");
});

test("every schema message is still written somewhere in the code", () => {
  const sources = listSources(join(import.meta.dirname, ".."))
    .filter((path) => !path.includes("i18n"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const english = flatten(serverMessages("en").validation);

  for (const message of english) {
    // Messages built with a constant or a field type are checked by their
    // fixed part.
    const fixed = message
      .replace(/^(signature|initials|date) /, "")
      .replace(/\d+ buttons$/, "");

    assert.ok(sources.includes(fixed), `Not found in the code: ${message}`);
  }
});

function listSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSources(path);
    }

    return path.endsWith(".ts") && !/\.(db)?test\.ts$/.test(path) ? [path] : [];
  });
}

function flatten(tree: object): string[] {
  return Object.values(tree).flatMap((value: unknown) =>
    typeof value === "string" ? [value] : flatten(value as object),
  );
}
