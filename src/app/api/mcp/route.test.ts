import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

import type { ApiContext } from "../../../lib/api/route.ts";
import { handleMcpRequest, validateMcpRequest } from "../../../lib/mcp/http.ts";

const APP_URL = "https://sign.example.test";
const API_KEY = `sdk_${"A".repeat(43)}`;

const context: ApiContext = {
  actor: {
    apiKeyId: "api-key-1",
    email: "owner@example.test",
    ipAddress: null,
    name: "Owner",
    scope: "prepare",
    userAgent: null,
    userId: "user-1",
  },
  rateLimit: { limit: 600, remaining: 599, resetSeconds: 60 },
  request: new Request(`${APP_URL}/api/mcp`),
};

function request(
  authorization = `Bearer ${API_KEY}`,
  host = "sign.example.test",
  origin?: string,
) {
  const headers = new Headers({ authorization, host });

  if (origin) {
    headers.set("origin", origin);
  }

  return new Request(`${APP_URL}/api/mcp`, { headers, method: "POST" });
}

test("MCP requests require a bearer API key", () => {
  assert.equal(
    validateMcpRequest(request("", "sign.example.test"), "prepare", APP_URL)
      ?.status,
    401,
  );
});

test("the MCP endpoint accepts only prepare keys", () => {
  assert.equal(validateMcpRequest(request(), "read", APP_URL)?.status, 403);
  assert.equal(validateMcpRequest(request(), "write", APP_URL)?.status, 403);
  assert.equal(validateMcpRequest(request(), "prepare", APP_URL), null);
});

test("the MCP endpoint rejects Host and Origin values outside the app origin", () => {
  assert.equal(
    validateMcpRequest(
      request(`Bearer ${API_KEY}`, "evil.example"),
      "prepare",
      APP_URL,
    )?.status,
    403,
  );
  assert.equal(
    validateMcpRequest(
      request(`Bearer ${API_KEY}`, "sign.example.test", "https://evil.example"),
      "prepare",
      APP_URL,
    )?.status,
    403,
  );
  assert.equal(validateMcpRequest(request(), "prepare", APP_URL), null);
});

test("the stateless endpoint supports tools/list through the official HTTP client", async () => {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${APP_URL}/api/mcp`),
    {
      fetch: (url, init) => {
        const headers = new Headers(init?.headers);

        headers.set("authorization", `Bearer ${API_KEY}`);
        headers.set("host", "sign.example.test");

        return handleMcpRequest(
          new Request(url, { ...init, headers }),
          context,
          APP_URL,
        );
      },
    },
  );
  const client = new Client({ name: "SignuDoc route test", version: "1.0.0" });

  try {
    await client.connect(transport);
    assert.deepEqual(await client.listTools(), { tools: [] });
  } finally {
    await client.close();
  }
});

test("malformed MCP JSON is rejected without exposing server details", async () => {
  const response = await handleMcpRequest(
    new Request(`${APP_URL}/api/mcp`, {
      body: "not-json",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        host: "sign.example.test",
      },
      method: "POST",
    }),
    context,
    APP_URL,
  );

  assert.equal(response.status, 400);
  assert.doesNotMatch(await response.text(), /Bearer sdk_|user-1|api-key-1/);
});
