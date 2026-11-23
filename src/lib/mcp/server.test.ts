import assert from "node:assert/strict";
import { test } from "node:test";

import packageJson from "../../../package.json" with { type: "json" };
import { createSignuDocMcpServer, MCP_SERVER_VERSION } from "./server.ts";
import type { ApiContext } from "../api/route.ts";

const context: ApiContext = {
  actor: {
    apiKeyId: "key-1",
    email: "owner@example.test",
    ipAddress: null,
    name: "Owner",
    scope: "prepare",
    userAgent: null,
    userId: "user-1",
  },
  rateLimit: { limit: 600, remaining: 599, resetSeconds: 60 },
  request: new Request("https://sign.example.test/api/mcp"),
};

test("the MCP factory creates an isolated server for each request", () => {
  const first = createSignuDocMcpServer(context);
  const second = createSignuDocMcpServer(context);

  assert.notEqual(first, second);
});

test("the MCP server reports the installed SignuDoc package version", () => {
  assert.equal(MCP_SERVER_VERSION, packageJson.version);
});
