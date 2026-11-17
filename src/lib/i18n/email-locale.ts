import { buildBranding } from "../branding.ts";
import { type DbExecutor, getDb } from "../db/connection.ts";
import { readStoredSettings, resolveSettings } from "../settings.ts";
import { type EnvSource } from "../utils/env.ts";
import { DEFAULT_LOCALE, type Locale } from "./locales.ts";

/**
 * The language the install's emails are written in, read through a given
 * database connection (the scheduled jobs pass their own). The hosted
 * service speaks English. A notice still goes out, in English, when the
 * settings cannot be read.
 */
export async function readEmailLocale(
  database: DbExecutor = getDb(),
  env: EnvSource = process.env,
): Promise<Locale> {
  try {
    return buildBranding(
      resolveSettings(await readStoredSettings(database), env),
    ).locale;
  } catch (error) {
    console.error("Could not read the email language; using English:", error);
    return DEFAULT_LOCALE;
  }
}
