// PetskySign: API keys for the integration API (/api/v1).
//
//   DATABASE_URL=postgres://...
//
//   npm run api-key -- create --email integracao@petsky.com.br --name "petsky produção"
//   npm run api-key -- list
//   npm run api-key -- revoke <id>
//   npm run api-key -- webhook <id> --url https://app.petsky.com.br/api/webhooks/petskysign
//   npm run api-key -- webhook <id> --clear
//   npm run api-key -- deliveries [--failed]
//
// A key acts as the account with that email, which must exist and have a
// verified email (create it in the app first). The key is printed once;
// only its SHA-256 is stored.

import pg from "pg";

import { normalizeDatabaseUrl } from "../db/database-url.mjs";
import { createApiKey, revokeApiKey } from "../src/lib/petsky/api-keys.ts";
import { generateWebhookSecret } from "../src/lib/petsky/webhook-delivery.ts";

/** https, or http only to this machine (local development). */
function isAllowedWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

function readArgument(name: string): string | null {
  const index = process.argv.indexOf(name);

  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main() {
  const command = process.argv[2];
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Set DATABASE_URL.");
  }

  const client = new pg.Client({
    connectionString: normalizeDatabaseUrl(connectionString),
  });

  await client.connect();

  try {
    if (command === "create") {
      const email = readArgument("--email")?.trim().toLowerCase();
      const name = readArgument("--name")?.trim() || "petsky";

      if (!email) {
        throw new Error("Pass --email <account email>.");
      }

      const user = await client.query<{ emailVerified: boolean; id: string }>(
        `SELECT id, "emailVerified" FROM "user" WHERE lower(email) = $1`,
        [email],
      );
      const account = user.rows[0];

      if (!account) {
        throw new Error(`No account with the email ${email}.`);
      }

      if (!account.emailVerified) {
        throw new Error(`The account ${email} has not verified its email.`);
      }

      const created = await createApiKey({ name, userId: account.id }, client);

      console.log(
        `Created API key ${created.id} (${created.name}) for ${email}.`,
      );
      console.log("Store it now; it is not shown again:\n");
      console.log(created.key);
      return;
    }

    if (command === "list") {
      const keys = await client.query(
        `
          SELECT k.id, k.name, k.prefix, u.email,
                 to_timestamp(k.created_at) AS created,
                 to_timestamp(k.last_used_at) AS last_used,
                 to_timestamp(k.revoked_at) AS revoked,
                 k.webhook_url AS webhook
          FROM api_keys k JOIN "user" u ON u.id = k.user_id
          ORDER BY k.created_at
        `,
      );

      console.table(keys.rows);
      return;
    }

    if (command === "revoke") {
      const id = process.argv[3];

      if (!id) {
        throw new Error("Pass the key id: revoke <id>.");
      }

      console.log(
        (await revokeApiKey(id, client))
          ? `Revoked ${id}.`
          : `No active key ${id}.`,
      );
      return;
    }

    if (command === "webhook") {
      const id = process.argv[3];

      if (!id || id.startsWith("--")) {
        throw new Error("Pass the key id: webhook <id> --url <url> | --clear.");
      }

      if (process.argv.includes("--clear")) {
        await client.query(
          `UPDATE api_keys SET webhook_url = NULL, webhook_secret = NULL WHERE id = $1`,
          [id],
        );
        console.log(`Webhook removed from ${id}.`);
        return;
      }

      const url = readArgument("--url")?.trim();

      if (!url || !isAllowedWebhookUrl(url)) {
        throw new Error(
          "Pass --url with an https URL (http only for localhost).",
        );
      }

      // A new secret each time the URL is set: the receiver gets it from here.
      const secret = generateWebhookSecret();
      const updated = await client.query(
        `
          UPDATE api_keys SET webhook_url = $1, webhook_secret = $2
          WHERE id = $3 AND revoked_at IS NULL
        `,
        [url, secret, id],
      );

      if (updated.rowCount !== 1) {
        throw new Error(`No active key ${id}.`);
      }

      console.log(`Webhooks for ${id} go to ${url}.`);
      console.log(
        "Signing secret (set it in the receiver; not shown again):\n",
      );
      console.log(secret);
      return;
    }

    if (command === "deliveries") {
      const rows = await client.query(
        `
          SELECT id, event, envelope_id, status, attempts,
                 last_status_code AS code, left(last_error, 60) AS error,
                 to_timestamp(created_at) AS created
          FROM webhook_deliveries
          WHERE ($1::boolean IS FALSE OR status = 'failed')
          ORDER BY created_at DESC
          LIMIT 50
        `,
        [process.argv.includes("--failed")],
      );

      console.table(rows.rows);
      return;
    }

    throw new Error(
      "Use: create --email <email> [--name <name>] | list | revoke <id> | webhook <id> --url <url> | webhook <id> --clear | deliveries [--failed]",
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
