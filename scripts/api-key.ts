// PetskySign: API keys for the integration API (/api/v1).
//
//   DATABASE_URL=postgres://...
//
//   npm run api-key -- create --email integracao@petsky.com.br --name "petsky produção"
//   npm run api-key -- list
//   npm run api-key -- revoke <id>
//
// A key acts as the account with that email, which must exist and have a
// verified email (create it in the app first). The key is printed once;
// only its SHA-256 is stored.

import pg from "pg";

import { normalizeDatabaseUrl } from "../db/database-url.mjs";
import { createApiKey, revokeApiKey } from "../src/lib/petsky/api-keys.ts";

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
                 to_timestamp(k.revoked_at) AS revoked
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

    throw new Error(
      "Use: create --email <email> [--name <name>] | list | revoke <id>",
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
