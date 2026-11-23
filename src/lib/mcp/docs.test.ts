import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "../../..");

test("the MCP guide documents setup, scope, upload, safety, and key rotation", async () => {
  const guide = await readFile(path.join(ROOT, "docs/mcp.md"), "utf8");

  for (const required of [
    "/api/mcp",
    "prepare",
    "bearer_token_env_var",
    "request_pdf_upload",
    "uploadId",
    "3 MiB",
    "cannot send",
    "revoke",
    "Streamable HTTP",
  ]) {
    assert.ok(
      guide.toLowerCase().includes(required.toLowerCase()),
      `docs/mcp.md must mention ${required}`,
    );
  }
});

test("the API guide explains prepare keys cannot send envelopes", async () => {
  const guide = await readFile(path.join(ROOT, "docs/api.md"), "utf8");
  assert.ok(guide.toLowerCase().includes("prepare drafts** key cannot send"));
  assert.match(guide, /review and send drafts from the dashboard/i);
});
