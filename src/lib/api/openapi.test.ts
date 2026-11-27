import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { fieldPlacementSchema, fieldTypeSchema } from "../schemas/field.ts";
import {
  alwaysRequiredFieldTypes,
  fieldTypes,
  signatureMeanings,
  type FieldType,
} from "../types/domain.ts";
import { buildOpenApiDocument } from "./openapi.ts";

// Every route file under src/app/api/v1 has a path in the OpenAPI
// description, with the same methods, and nothing is described that does
// not exist.

const V1_DIR = path.join(import.meta.dirname, "../../app/api/v1");

async function listRouteFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      found.push(
        ...(await listRouteFiles(
          path.join(dir, entry.name),
          `${prefix}/${entry.name.replace(/^\[(.+)\]$/, "{$1}")}`,
        )),
      );
    } else if (entry.name === "route.ts") {
      found.push(prefix);
    }
  }

  return found;
}

test("the OpenAPI description matches the route files", async () => {
  const { readFile } = await import("node:fs/promises");
  const document = buildOpenApiDocument("https://sign.example.com/api/v1");
  const routes = await listRouteFiles(V1_DIR);

  assert.deepEqual([...routes].sort(), Object.keys(document.paths).sort());

  for (const route of routes) {
    const source = await readFile(
      path.join(V1_DIR, route.replace(/\{(\w+)\}/g, "[$1]"), "route.ts"),
      "utf8",
    );
    const methods = [
      ...source.matchAll(
        /export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g,
      ),
    ]
      .map((match) => match[1]?.toLowerCase())
      .sort();
    const described = Object.keys(
      document.paths[route as keyof typeof document.paths],
    ).sort();

    assert.deepEqual(described, methods, `methods for ${route}`);
  }
});

test("the OpenAPI description allows the values the API accepts", () => {
  const document = buildOpenApiDocument("https://sign.example.com/api/v1");
  const { CreateEnvelope, Field } = document.components.schemas;
  const fromTemplate =
    document.paths["/templates/{id}/envelopes"].post.requestBody.content[
      "application/json"
    ].schema.properties.signers.items.properties;

  assert.deepEqual(Field.properties.type.enum, fieldTypeSchema.options);
  assert.deepEqual(Field.if.properties.type.enum, [
    ...alwaysRequiredFieldTypes,
  ]);
  assert.deepEqual(Field.if.required, ["type"]);
  assert.equal(Field.then.properties.required.const, true);
  assert.equal(Field.properties.required.default, true);
  assert.equal(Field.properties.required.type, "boolean");

  for (const type of alwaysRequiredFieldTypes) {
    assert.match(
      Field.properties.required.description,
      new RegExp(`\\b${type}\\b`),
      `Field.properties.required.description should mention ${type}`,
    );
  }

  assert.deepEqual(
    CreateEnvelope.properties.signers.items.properties.signatureMeaning.enum,
    [...signatureMeanings],
  );
  assert.deepEqual(fromTemplate.signatureMeaning.enum, [...signatureMeanings]);
});

test("the OpenAPI Field schema matches server validation for required by field type", () => {
  const document = buildOpenApiDocument("https://sign.example.com/api/v1");
  const { Field } = document.components.schemas;
  const alwaysRequired = new Set<string>(Field.if.properties.type.enum);

  function openApiAllowsRequired(
    type: FieldType,
    required: boolean | undefined,
  ): boolean {
    if (required === undefined) {
      return true;
    }

    if (alwaysRequired.has(type)) {
      return required === Field.then.properties.required.const;
    }

    return typeof required === "boolean";
  }

  const basePlacement = {
    height: 0.05,
    page: 1,
    signerId: "signer-1",
    width: 0.25,
    x: 0.1,
    y: 0.5,
  };

  for (const type of fieldTypes) {
    const extra =
      type === "dropdown"
        ? { options: ["Yes", "No"] }
        : type === "radio"
          ? { groupId: "choice" }
          : {};

    for (const required of [undefined, true, false] as const) {
      const candidate =
        required === undefined
          ? { ...basePlacement, ...extra, type }
          : { ...basePlacement, ...extra, required, type };
      const serverAllowed = fieldPlacementSchema.safeParse(candidate).success;
      const schemaAllowed = openApiAllowsRequired(type, required);

      assert.equal(
        schemaAllowed,
        serverAllowed,
        `mismatch for type=${type}, required=${String(required)}`,
      );
    }
  }
});

test("the OpenAPI description gives this install's signer limit", () => {
  const document = buildOpenApiDocument("https://sign.example.com/api/v1", 40);
  const fromTemplate =
    document.paths["/templates/{id}/envelopes"].post.requestBody.content[
      "application/json"
    ].schema.properties.signers;

  assert.equal(
    document.components.schemas.CreateEnvelope.properties.signers.maxItems,
    40,
  );
  assert.equal(fromTemplate.maxItems, 40);
});

test("the OpenAPI description documents 503 for routes that email signers", () => {
  const document = buildOpenApiDocument("https://sign.example.com/api/v1");

  for (const pathKey of [
    "/envelopes/{id}/send",
    "/envelopes/{id}/remind",
    "/envelopes/{id}/void",
  ] as const) {
    assert.ok(
      "503" in document.paths[pathKey].post.responses,
      `${pathKey} should document 503 when email is unconfigured`,
    );
  }
});
