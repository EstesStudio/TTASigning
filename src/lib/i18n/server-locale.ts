import { getBranding } from "../settings.ts";
import { DEFAULT_LOCALE, type Locale } from "./locales.ts";
import {
  serverMessages,
  type ServerMessages,
  translateMessage,
  type UserMessage,
} from "./server-messages.ts";

/**
 * The language of the install, for what a route sends back. The hosted
 * service speaks English, and so does a response whose settings cannot be
 * read (the route is usually failing for the same reason).
 */
export async function installLocale(): Promise<Locale> {
  try {
    return (await getBranding()).locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The dictionary of the install's language. */
export async function installMessages(): Promise<ServerMessages> {
  return serverMessages(await installLocale());
}

/** A message, or an error's message, in the install's language. */
export async function localize(message: UserMessage | Error): Promise<string> {
  return translateMessage(message, await installLocale());
}
