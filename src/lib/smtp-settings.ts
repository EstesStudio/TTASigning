import { isIP } from "node:net";

import { z } from "zod";

import {
  afterCommit,
  getDb,
  queryOne,
  type DbExecutor,
} from "./db/connection.ts";
import {
  decryptPrivateKey,
  encryptPrivateKey,
  secretKeyFor,
} from "./services/seal-identity.ts";
import { invalidateSettingsCache, isMissingSchemaError } from "./settings.ts";
import { readEnv, type EnvSource } from "./utils/env.ts";

// The SMTP server an administrator can enter under Settings, Organization,
// for an install that sends with EMAIL_DRIVER=smtp. Each SMTP_* environment
// variable that is set wins over what is saved, field by field, and the page
// shows that field without letting it be changed.
//
// The password is kept in app_settings sealed with a key derived from the
// auth secret, as the seal key is (see seal-identity.ts). It is never sent
// back to the browser. If BETTER_AUTH_SECRET changes, the saved password can
// no longer be read and has to be entered again.

const SECRET_CONTEXT = "signudoc-email-smtp";

export const SMTP_VARIABLES = {
  host: "SMTP_HOST",
  password: "SMTP_PASSWORD",
  port: "SMTP_PORT",
  secure: "SMTP_SECURE",
  user: "SMTP_USER",
} as const;

export type SmtpField = keyof typeof SMTP_VARIABLES;

const SMTP_FIELDS = Object.keys(SMTP_VARIABLES) as SmtpField[];

/** What is saved. Null means "not set". */
export type StoredSmtpSettings = {
  host: string | null;
  port: number | null;
  /** True for TLS from the start, false for STARTTLS, null to go by the port. */
  secure: boolean | null;
  /** The password, sealed. Never leaves the server. */
  sealedPassword: string | null;
  user: string | null;
};

export const NO_STORED_SMTP_SETTINGS: StoredSmtpSettings = {
  host: null,
  port: null,
  sealedPassword: null,
  secure: null,
  user: null,
};

/** What the Settings page shows. The password itself is never part of it. */
export type SmtpSettingsView = {
  /** The fields set by an environment variable, shown but not editable. */
  fromEnv: Record<SmtpField, boolean>;
  host: string | null;
  /**
   * "unreadable" when a password is saved but BETTER_AUTH_SECRET has
   * changed since, so it has to be entered again.
   */
  password: "none" | "saved" | "unreadable";
  port: number | null;
  secure: boolean | null;
  user: string | null;
};

type SmtpSettingsRow = {
  smtp_host: string | null;
  smtp_password: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
};

export async function readStoredSmtpSettings(
  database: DbExecutor = getDb(),
): Promise<StoredSmtpSettings> {
  try {
    const row = await queryOne<SmtpSettingsRow>(
      database,
      `select smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password
       from public.app_settings where id`,
    );

    return row
      ? {
          host: row.smtp_host,
          port: row.smtp_port,
          sealedPassword: row.smtp_password,
          secure: row.smtp_secure,
          user: row.smtp_user,
        }
      : NO_STORED_SMTP_SETTINGS;
  } catch (error) {
    // Before this version's migration has run, nothing can be saved yet.
    if (isMissingSchemaError(error)) {
      return NO_STORED_SMTP_SETTINGS;
    }

    throw error;
  }
}

function openPassword(
  stored: StoredSmtpSettings,
  env: EnvSource,
): string | null {
  return stored.sealedPassword
    ? decryptPrivateKey(
        stored.sealedPassword,
        secretKeyFor(SECRET_CONTEXT, env),
      )
    : null;
}

function isSetInEnv(env: EnvSource, field: SmtpField): boolean {
  return readEnv(env, SMTP_VARIABLES[field]) !== undefined;
}

/**
 * Whether a field can only come from the environment. It is, when its own
 * variable is set, and for the server, port, encryption and user name also
 * when SMTP_PASSWORD is: a password from the environment is only ever sent
 * to a server the environment names, never to one saved in the app.
 */
function isLockedByEnv(env: EnvSource, field: SmtpField): boolean {
  return (
    isSetInEnv(env, field) ||
    (field !== "password" && isSetInEnv(env, "password"))
  );
}

/**
 * The SMTP_* values to send with: each variable that is set in the
 * environment, and the saved value for every other one. A saved password
 * that can no longer be read is left out, so the install counts as not set
 * up rather than trying a login that cannot work.
 */
export function smtpEnvFor(
  env: EnvSource,
  stored: StoredSmtpSettings,
): EnvSource {
  const saved: Record<SmtpField, string | undefined> = {
    host: stored.host ?? undefined,
    password: openPassword(stored, env) ?? undefined,
    port: stored.port === null ? undefined : String(stored.port),
    secure: stored.secure === null ? undefined : String(stored.secure),
    user: stored.user ?? undefined,
  };
  const merged: Record<string, string | undefined> = { ...env };

  for (const field of SMTP_FIELDS) {
    const variable = SMTP_VARIABLES[field];

    merged[variable] = isSetInEnv(env, field)
      ? env[variable]
      : isLockedByEnv(env, field)
        ? undefined
        : saved[field];
  }

  return merged;
}

export function toSmtpSettingsView(
  env: EnvSource,
  stored: StoredSmtpSettings,
): SmtpSettingsView {
  const merged = smtpEnvFor(env, stored);
  const port = Number(readEnv(merged, "SMTP_PORT"));
  const secure = readEnv(merged, "SMTP_SECURE")?.toLowerCase();

  return {
    fromEnv: Object.fromEntries(
      SMTP_FIELDS.map((field) => [field, isLockedByEnv(env, field)]),
    ) as Record<SmtpField, boolean>,
    host: readEnv(merged, "SMTP_HOST") ?? null,
    password:
      readEnv(merged, "SMTP_PASSWORD") !== undefined
        ? "saved"
        : stored.sealedPassword
          ? "unreadable"
          : "none",
    port: Number.isInteger(port) && port > 0 ? port : null,
    secure: secure ? secure === "true" : null,
    user: readEnv(merged, "SMTP_USER") ?? null,
  };
}

function blankToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0 ? null : value;
}

const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

/**
 * A change from the form. A field left out is kept as it is; an empty one
 * is cleared. The password can only be replaced, never read back.
 */
export const smtpSettingsUpdateSchema = z
  .object({
    host: z
      .preprocess(
        blankToNull,
        z
          .string()
          .trim()
          .refine((value) => HOST_NAME.test(value) || isIP(value) !== 0)
          .nullable(),
      )
      .optional(),
    password: z.string().min(1).max(1024).optional(),
    port: z.number().int().min(1).max(65535).nullable().optional(),
    secure: z.boolean().nullable().optional(),
    user: z
      .preprocess(blankToNull, z.string().trim().max(320).nullable())
      .optional(),
  })
  .strict();

export type SmtpSettingsUpdate = z.infer<typeof smtpSettingsUpdateSchema>;

const FIELD_ERROR_MESSAGES: Record<SmtpField, string> = {
  host: "Enter the server's name, such as smtp.example.com, without a port",
  password: "Enter the password, of at most 1,024 characters",
  port: "Enter a port between 1 and 65535",
  secure: "Choose how the connection is encrypted",
  user: "Enter a user name of at most 320 characters",
};

export class SmtpSettingsError extends Error {
  readonly fieldErrors: Partial<Record<SmtpField, string>>;

  constructor(fieldErrors: Partial<Record<SmtpField, string>>) {
    super("Check the highlighted fields.");
    this.name = "SmtpSettingsError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Checks a change from the form. Fields set by the environment are dropped
 * first: they cannot be changed here, and what is saved for them would
 * never be used.
 */
export function parseSmtpSettingsUpdate(
  rawInput: unknown,
  env: EnvSource,
): SmtpSettingsUpdate {
  const input: unknown =
    typeof rawInput === "object" && rawInput !== null
      ? Object.fromEntries(
          Object.entries(rawInput).filter(
            ([key]) =>
              !(key in SMTP_VARIABLES && isLockedByEnv(env, key as SmtpField)),
          ),
        )
      : rawInput;
  const parsed = smtpSettingsUpdateSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<SmtpField, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];

      if (typeof field === "string" && field in FIELD_ERROR_MESSAGES) {
        fieldErrors[field as SmtpField] =
          FIELD_ERROR_MESSAGES[field as SmtpField];
      }
    }

    throw new SmtpSettingsError(fieldErrors);
  }

  return parsed.data;
}

/** One line of the audit trail's "settings_changed" record per field. */
export type SmtpSettingsChanges = Record<
  string,
  { from: unknown; to: unknown }
>;

/**
 * What is saved after a change, and what changed, keyed as the audit trail
 * names settings. The password shows only as saved or replaced, never as
 * its value or its sealed form.
 */
export function applySmtpSettingsUpdate(
  stored: StoredSmtpSettings,
  update: SmtpSettingsUpdate,
  env: EnvSource,
): { changes: SmtpSettingsChanges; next: StoredSmtpSettings } {
  const passwordChanged =
    update.password !== undefined &&
    update.password !== openPassword(stored, env);
  const destinationChanged = (["host", "port", "secure", "user"] as const).some(
    (field) => update[field] !== undefined && update[field] !== stored[field],
  );

  // A saved password is only sent to the server it was saved for. Without
  // this, an administrator could point the saved login at a server of their
  // own and read it from "Check connection".
  if (
    destinationChanged &&
    stored.sealedPassword &&
    update.password === undefined
  ) {
    throw new SmtpSettingsError({
      password: "Enter the password again for the new server or user name",
    });
  }
  const next: StoredSmtpSettings = {
    host: update.host === undefined ? stored.host : update.host,
    port: update.port === undefined ? stored.port : update.port,
    sealedPassword:
      passwordChanged && update.password !== undefined
        ? encryptPrivateKey(update.password, secretKeyFor(SECRET_CONTEXT, env))
        : stored.sealedPassword,
    secure: update.secure === undefined ? stored.secure : update.secure,
    user: update.user === undefined ? stored.user : update.user,
  };
  const changes: SmtpSettingsChanges = {};

  for (const [field, key] of [
    ["host", "smtpHost"],
    ["port", "smtpPort"],
    ["secure", "smtpSecure"],
    ["user", "smtpUser"],
  ] as const) {
    if (next[field] !== stored[field]) {
      changes[key] = { from: stored[field], to: next[field] };
    }
  }

  if (passwordChanged) {
    changes.smtpPassword = {
      from: stored.sealedPassword ? "saved" : null,
      to: "replaced",
    };
  }

  return { changes, next };
}

/**
 * Writes the SMTP settings, creating the settings row if there is none.
 * Clears the "email works" mark, which was earned with the old server.
 */
export async function saveSmtpSettings(
  next: StoredSmtpSettings,
  database: DbExecutor,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // A row that is being created is a decision about this install, and the
  // safe starting point for sign-up is closed, as in saveSettings.
  await database.query(
    `
      insert into public.app_settings (
        id, signup_mode, smtp_host, smtp_port, smtp_secure, smtp_user,
        smtp_password, created_at, updated_at
      )
      values (true, 'closed', $1, $2, $3, $4, $5, $6, $6)
      on conflict (id) do update set
        smtp_host = excluded.smtp_host,
        smtp_port = excluded.smtp_port,
        smtp_secure = excluded.smtp_secure,
        smtp_user = excluded.smtp_user,
        smtp_password = excluded.smtp_password,
        email_ready_at = null,
        updated_at = excluded.updated_at
    `,
    [next.host, next.port, next.secure, next.user, next.sealedPassword, now],
  );

  afterCommit(database, invalidateSettingsCache);
}
