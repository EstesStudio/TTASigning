import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import type pg from "pg";

import { openTestDatabase } from "./db/test-database.ts";
import {
  readSignature,
  removeSignature,
  saveSignature,
} from "./saved-signature.ts";

// Run with `npm run test:db`.

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let database: pg.Pool;
const userId = randomUUID();

before(async () => {
  database = await openTestDatabase();
  await database.query(
    `insert into public."user" (id, name, email, "emailVerified") values ($1, 'Signer', $2, true)`,
    [userId, `${userId}@example.test`],
  );
});

after(async () => {
  await database.query(`delete from public."user" where id = $1`, [userId]);
  await database.end();
});

test("a saved signature is read back, replaced and removed", async () => {
  assert.equal(await readSignature(userId, database), null);

  await saveSignature(userId, PNG, database, 1);
  assert.equal(await readSignature(userId, database), PNG);

  await saveSignature(userId, ` ${PNG}\n`, database, 2);
  const rows = await database.query(
    `select updated_at from public.saved_signatures where user_id = $1`,
    [userId],
  );
  assert.deepEqual(rows.rows, [{ updated_at: 2 }]);

  await removeSignature(userId, database);
  assert.equal(await readSignature(userId, database), null);
});

test("deleting the account deletes its signature", async () => {
  const otherId = randomUUID();

  await database.query(
    `insert into public."user" (id, name, email, "emailVerified") values ($1, 'Other', $2, true)`,
    [otherId, `${otherId}@example.test`],
  );
  await saveSignature(otherId, PNG, database);
  await database.query(`delete from public."user" where id = $1`, [otherId]);

  assert.equal(await readSignature(otherId, database), null);
});
