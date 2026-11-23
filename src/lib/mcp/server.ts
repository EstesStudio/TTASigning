import { McpServer } from "@modelcontextprotocol/server";
import packageJson from "../../../package.json" with { type: "json" };

import type { ApiContext } from "../api/route.ts";

export const MCP_SERVER_VERSION = packageJson.version;

/** Builds one request-scoped SignuDoc server with no process-local session state. */
export function createSignuDocMcpServer(context: ApiContext): McpServer {
  return new McpServer(
    {
      name: "SignuDoc",
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: { tools: {} },
      instructions: `This authenticated API key has ${context.actor.scope} access. This endpoint cannot send envelopes; owners must review and send drafts in the dashboard.`,
    },
  );
}
