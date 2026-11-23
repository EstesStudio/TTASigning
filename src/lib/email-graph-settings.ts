import { z } from "zod";

import {
  afterCommit,
  getDb,
  queryOne,
  withTransaction,
  type DbExecutor,
  type DbPool,
} from "./db/connection.ts";
import { emailSchema } from "./schemas/common.ts";
import {
  buildGraphConfig,
  createGraphSender,
  GRAPH_ENV_KEYS,
  readTokenRoles,
  type GraphConfig,
  type GraphFetch,
} from "./services/email-graph.ts";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  secretKeyFor,
} from "./services/seal-identity.ts";
import {
  getSettings,
  invalidateSettingsCache,
  isMissingSchemaError,
  type ResolvedSettings,
} from "./settings.ts";
import { readEnv, type EnvSource } from "./utils/env.ts";

// Microsoft 365 credentials an administrator enters in Settings, for
// EMAIL_DRIVER=graph, instead of setting the MICROSOFT_GRAPH_* variables.
//
// They are kept in app_settings. The client secret is encrypted with a key
// derived from BETTER_AUTH_SECRET, the same way as two-step sign-in keys, for
// its own purpose: if that secret changes, the stored client secret can no
// longer be read and has to be entered again.
//
// Each variable still wins over what is stored, field by field, as
// RESEND_FROM_EMAIL does over the sender address. The mailbox mail goes out
// from is the install's sender address (MICROSOFT_GRAPH_SENDER, or the one
// saved in Settings), so it is not stored twice.

const SECRET_CONTEXT = "signudoc/email-graph/v1";

export type GraphField = "clientId" | "clientSecret" | "sender" | "tenantId";

export const GRAPH_FIELD_VARIABLES: Record<
  GraphField,
  (typeof GRAPH_ENV_KEYS)[number]
> = {
  clientId: "MICROSOFT_GRAPH_CLIENT_ID",
  clientSecret: "MICROSOFT_GRAPH_CLIENT_SECRET",
  sender: "MICROSOFT_GRAPH_SENDER",
  tenantId: "MICROSOFT_GRAPH_TENANT_ID",
};

const GRAPH_FIELDS = Object.keys(GRAPH_FIELD_VARIABLES) as GraphField[];

/** What is stored, with the secret still sealed. */
export type StoredGraphSettings = {
  clientId: string | null;
  clientSecret: string | null;
  tenantId: string | null;
};

type StoredGraphRow = {
  graph_client_id: string | null;
  graph_client_secret: string | null;
  graph_tenant_id: string | null;
};

const EMPTY: StoredGraphSettings = {
  clientId: null,
  clientSecret: null,
  tenantId: null,
};

/**
 * Reads the stored credentials. A database whose migration has not run yet
 * has none.
 */
export async function readStoredGraphSettings(
  database: DbExecutor = getDb(),
): Promise<StoredGraphSettings> {
  try {
    const row = await queryOne<StoredGraphRow>(
      database,
      `select graph_tenant_id, graph_client_id, graph_client_secret
       from public.app_settings where id`,
    );

    return row
      ? {
          clientId: row.graph_client_id,
          clientSecret: row.graph_client_secret,
          tenantId: row.graph_tenant_id,
        }
      : EMPTY;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return EMPTY;
    }

    throw error;
  }
}

export function sealGraphSecret(
  secret: string,
  env: EnvSource = process.env,
): string {
  return encryptPrivateKey(secret, secretKeyFor(SECRET_CONTEXT, env));
}

export function openGraphSecret(
  sealed: string,
  env: EnvSource = process.env,
): string | null {
  return decryptPrivateKey(sealed, secretKeyFor(SECRET_CONTEXT, env));
}

/** Where the configuration in use comes from, and what is still missing. */
export type GraphResolution = {
  config: GraphConfig | null;
  /** The fields set by an environment variable, shown locked in Settings. */
  fromEnv: Record<GraphField, boolean>;
  /** The variables, or Settings fields, nothing has given a value yet. */
  missing: GraphField[];
  /** A client secret is stored but BETTER_AUTH_SECRET no longer opens it. */
  secretUnreadable: boolean;
  /** The values in use, the secret left out. */
  values: Omit<Record<GraphField, string | null>, "clientSecret"> & {
    clientSecretSet: boolean;
  };
};

/**
 * The configuration from the environment and what is stored, the
 * environment winning field by field. Pure, so tests need no database.
 */
export function combineGraphSettings(
  stored: StoredGraphSettings,
  settings: Pick<ResolvedSettings, "senderAddress" | "senderAddressFromEnv">,
  env: EnvSource = process.env,
): GraphResolution {
  const fromEnv = Object.fromEntries(
    GRAPH_FIELDS.map((field) => [
      field,
      readEnv(env, GRAPH_FIELD_VARIABLES[field]) !== undefined,
    ]),
  ) as Record<GraphField, boolean>;

  let secretUnreadable = false;
  let storedSecret: string | null = null;

  if (!fromEnv.clientSecret && stored.clientSecret) {
    storedSecret = openGraphSecret(stored.clientSecret, env);
    secretUnreadable = storedSecret === null;
  }

  const values = {
    clientId: readEnv(env, "MICROSOFT_GRAPH_CLIENT_ID") ?? stored.clientId,
    clientSecret: readEnv(env, "MICROSOFT_GRAPH_CLIENT_SECRET") ?? storedSecret,
    // resolveSettings has already put MICROSOFT_GRAPH_SENDER in place.
    sender: settings.senderAddress,
    tenantId: readEnv(env, "MICROSOFT_GRAPH_TENANT_ID") ?? stored.tenantId,
  };
  const missing = GRAPH_FIELDS.filter((field) => !values[field]);
  const { clientSecret, ...shown } = values;

  return {
    config:
      missing.length === 0
        ? buildGraphConfig(
            {
              clientId: values.clientId!,
              clientSecret: clientSecret!,
              sender: values.sender!,
              tenantId: values.tenantId!,
            },
            env,
          )
        : null,
    fromEnv: { ...fromEnv, sender: settings.senderAddressFromEnv },
    missing,
    secretUnreadable,
    values: { ...shown, clientSecretSet: clientSecret !== null },
  };
}

/** The configuration this install should send with right now. */
export async function resolveGraphConfig(
  env: EnvSource = process.env,
  database?: DbExecutor,
): Promise<GraphResolution> {
  const sender = readEnv(env, "MICROSOFT_GRAPH_SENDER");

  // Fully configured by the environment, as before Settings could hold it:
  // nothing to read.
  if (GRAPH_ENV_KEYS.every((key) => readEnv(env, key) !== undefined)) {
    return combineGraphSettings(
      EMPTY,
      { senderAddress: sender ?? null, senderAddressFromEnv: true },
      env,
    );
  }

  const [settings, stored] = await Promise.all([
    getSettings(env),
    readStoredGraphSettings(database ?? getDb()),
  ]);

  return combineGraphSettings(stored, settings, env);
}

// What the Microsoft 365 form sends.

export class GraphSettingsError extends Error {
  readonly fieldErrors: Partial<Record<GraphField, string>>;

  constructor(fieldErrors: Partial<Record<GraphField, string>>) {
    super("Check the highlighted fields.");
    this.name = "GraphSettingsError";
    this.fieldErrors = fieldErrors;
  }
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A tenant is named by its ID or by one of its domains.
const TENANT_DOMAIN = /^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;

const graphSettingsSchema = z.object({
  clientId: z.string().trim().regex(GUID).optional(),
  // Blank keeps the stored secret.
  clientSecret: z.string().trim().max(1024).optional(),
  sender: emailSchema.optional(),
  tenantId: z
    .string()
    .trim()
    .refine((value) => GUID.test(value) || TENANT_DOMAIN.test(value))
    .optional(),
});

const FIELD_MESSAGES: Record<GraphField, string> = {
  clientId:
    "Enter the Application (client) ID from the app registration, such as 00000000-0000-0000-0000-000000000000",
  clientSecret: "Enter the client secret's value, not its ID",
  sender: "Enter the address of the mailbox the app may send from",
  tenantId:
    "Enter the Directory (tenant) ID, or a domain of the tenant such as acme.onmicrosoft.com",
};

/** What a save changed, for the audit trail. The secret is never recorded. */
export type GraphSettingsChanges = Record<
  string,
  { from: unknown; to: unknown }
>;

/**
 * Validates and saves the Microsoft 365 form. Fields set by an environment
 * variable are left alone. Any change clears the "email works" mark, which
 * was earned with the old credentials.
 */
export async function saveGraphSettings(
  rawInput: unknown,
  {
    database = getDb(),
    env = process.env,
  }: { database?: DbPool; env?: EnvSource } = {},
): Promise<GraphSettingsChanges> {
  const input =
    typeof rawInput === "object" && rawInput !== null
      ? { ...(rawInput as Record<string, unknown>) }
      : {};
  const settings = await getSettings(env);
  const locked = combineGraphSettings(EMPTY, settings, env).fromEnv;

  for (const field of GRAPH_FIELDS) {
    if (locked[field]) {
      delete input[field];
    }
  }

  const parsed = graphSettingsSchema.safeParse(input);
  const fieldErrors: Partial<Record<GraphField, string>> = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as GraphField;

      fieldErrors[field] ??= FIELD_MESSAGES[field];
    }

    throw new GraphSettingsError(fieldErrors);
  }

  const next = parsed.data;

  return withTransaction(async (tx) => {
    await tx.query(`SELECT id FROM app_settings WHERE id FOR UPDATE`);

    const current = await readStoredGraphSettings(tx);
    const row = await queryOne<{ sender_address: string | null }>(
      tx,
      `select sender_address from public.app_settings where id`,
    );

    if (!row) {
      throw new Error("Finish setting up the site before connecting email.");
    }

    const update = {
      clientId: locked.clientId ? current.clientId : (next.clientId ?? null),
      clientSecret:
        locked.clientSecret || !next.clientSecret
          ? current.clientSecret
          : sealGraphSecret(next.clientSecret, env),
      sender: locked.sender
        ? row.sender_address
        : (next.sender?.toLowerCase() ?? null),
      tenantId: locked.tenantId ? current.tenantId : (next.tenantId ?? null),
    };

    // A field nothing else sets must be filled in. The secret only needs
    // typing the first time, or when the stored one can no longer be read.
    for (const field of ["clientId", "sender", "tenantId"] as const) {
      if (!locked[field] && !update[field]) {
        fieldErrors[field] = FIELD_MESSAGES[field];
      }
    }

    if (
      !locked.clientSecret &&
      (!update.clientSecret || !openGraphSecret(update.clientSecret, env))
    ) {
      fieldErrors.clientSecret = FIELD_MESSAGES.clientSecret;
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new GraphSettingsError(fieldErrors);
    }

    const changes: GraphSettingsChanges = {};

    if (update.tenantId !== current.tenantId) {
      changes.microsoftTenantId = {
        from: current.tenantId,
        to: update.tenantId,
      };
    }

    if (update.clientId !== current.clientId) {
      changes.microsoftClientId = {
        from: current.clientId,
        to: update.clientId,
      };
    }

    if (update.clientSecret !== current.clientSecret) {
      changes.microsoftClientSecret = {
        from: current.clientSecret ? "set" : null,
        to: "replaced",
      };
    }

    if (update.sender !== row.sender_address) {
      changes.senderAddress = { from: row.sender_address, to: update.sender };
    }

    if (Object.keys(changes).length === 0) {
      return changes;
    }

    await tx.query(
      `update public.app_settings
       set graph_tenant_id = $1,
           graph_client_id = $2,
           graph_client_secret = $3,
           sender_address = $4,
           email_ready_at = null,
           updated_at = $5
       where id`,
      [
        update.tenantId,
        update.clientId,
        update.clientSecret,
        update.sender,
        Math.floor(Date.now() / 1000),
      ],
    );
    afterCommit(tx, invalidateSettingsCache);

    return changes;
  }, database);
}

/**
 * Forgets the stored credentials. The sender address stays: it is the
 * install's, whichever way email goes out.
 */
export async function clearGraphSettings(
  database: DbPool = getDb(),
): Promise<GraphSettingsChanges> {
  return withTransaction(async (tx): Promise<GraphSettingsChanges> => {
    await tx.query(`SELECT id FROM app_settings WHERE id FOR UPDATE`);

    const current = await readStoredGraphSettings(tx);

    if (!current.tenantId && !current.clientId && !current.clientSecret) {
      return {};
    }

    await tx.query(
      `update public.app_settings
       set graph_tenant_id = null,
           graph_client_id = null,
           graph_client_secret = null,
           email_ready_at = null,
           updated_at = $1
       where id`,
      [Math.floor(Date.now() / 1000)],
    );
    afterCommit(tx, invalidateSettingsCache);

    return {
      microsoftClientId: { from: current.clientId, to: null },
      microsoftClientSecret: {
        from: current.clientSecret ? "set" : null,
        to: null,
      },
      microsoftTenantId: { from: current.tenantId, to: null },
    };
  }, database);
}

export type GraphPermissionCheck =
  | { message: string; signedIn: false }
  | {
      roles: string[];
      signedIn: true;
      /**
       * Mail.Send was granted in Entra for the whole tenant: the app can
       * send as anyone in the organization, not only from its mailbox.
       */
      tenantWideMailSend: boolean;
    };

/**
 * Signs in as the app with a fresh token and reads what it was granted.
 * Sending the test email afterwards shows whether the mailbox is allowed.
 */
export async function checkGraphPermissions({
  env = process.env,
  fetch,
  resolution,
}: {
  env?: EnvSource;
  fetch?: GraphFetch;
  resolution?: GraphResolution;
} = {}): Promise<GraphPermissionCheck> {
  const { config } = resolution ?? (await resolveGraphConfig(env));

  if (!config) {
    return {
      message: "Fill in every Microsoft 365 setting first.",
      signedIn: false,
    };
  }

  try {
    // Not the shared sender: its cached token may predate a consent that was
    // just granted or taken back.
    const token = await createGraphSender({
      config,
      fetch,
      wait: async () => undefined,
    }).accessToken();
    const roles = readTokenRoles(token);

    return {
      roles,
      signedIn: true,
      tenantWideMailSend: roles.includes("Mail.Send"),
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && error.message
          ? error.message
          : "Microsoft sign-in failed.",
      signedIn: false,
    };
  }
}
