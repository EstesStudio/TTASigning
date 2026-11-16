import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

// The "Deploy to Cloudflare" button in the README, and what it depends on
// in the repository. Cloudflare reads the Wrangler configuration and the
// example secrets file at the top of the repository it is pointed at, so a
// file moved or a value added breaks the button without any other sign.
// https://developers.cloudflare.com/workers/platform/deploy-buttons/

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const read = (...segments: string[]) =>
  readFileSync(path.join(repoRoot, ...segments), "utf8");

const DEPLOY_LINK =
  /https:\/\/deploy\.workers\.cloudflare\.com\/\?url=[^\s)"<>]+/;

function readDeployLink(text: string, where: string): URL {
  const match = DEPLOY_LINK.exec(text);

  assert.ok(match, `${where} has no Deploy to Cloudflare link`);

  return new URL(match[0]);
}

test("the button points at a GitHub repository, not a folder in one", () => {
  const target = new URL(
    readDeployLink(read("README.md"), "README.md").searchParams.get("url") ??
      "",
  );

  assert.equal(target.hostname, "github.com");
  // Cloudflare treats a folder as a repository of its own, and the
  // container is built from the whole of this one.
  assert.match(target.pathname, /^\/[\w.-]+\/[\w.-]+\/?$/);
});

test("the agent deploy guide opens the same link as the button", () => {
  assert.equal(
    readDeployLink(
      read("docs", "deploy-to-cloudflare-with-an-agent.md"),
      "docs/deploy-to-cloudflare-with-an-agent.md",
    ).href,
    readDeployLink(read("README.md"), "README.md").href,
  );
});

test("the Wrangler configuration is at the top and its files exist", () => {
  const config = read("wrangler.jsonc");
  const main = /"main":\s*"([^"]+)"/.exec(config)?.[1];
  const dockerfile = /"dockerfile":\s*"([^"]+)"/.exec(config)?.[1];

  assert.ok(main && existsSync(path.join(repoRoot, main)), "main");
  assert.ok(
    dockerfile && existsSync(path.join(repoRoot, dockerfile)),
    "dockerfile",
  );
  // The image is built from the whole repository.
  assert.match(config, /"build_context":\s*"\."/);
});

test("the button asks for the database and nothing else, and carries no values", () => {
  const settings = read(".dev.vars.example")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  // A value in a public file is a secret shared with everyone, and every
  // setting besides the database is worked out by the Worker.
  assert.deepEqual(settings, ["DATABASE_URL="]);
});
