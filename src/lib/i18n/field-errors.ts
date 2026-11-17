import { installLocale } from "./server-locale.ts";
import {
  inEnglish,
  translateMessage,
  type UserMessage,
} from "./server-messages.ts";

// What is wrong with each field of a form, as the server answers it. An
// error keeps the messages as `UserMessage`s and also in English (its
// `fieldErrors`, for logs and tests); the route sends them in the install's
// language.

export type UserFieldErrors<Field extends string> = Partial<
  Record<Field, UserMessage>
>;

function mapFieldErrors<Field extends string>(
  errors: UserFieldErrors<Field>,
  render: (message: UserMessage) => string,
): Partial<Record<Field, string>> {
  const rendered: Partial<Record<Field, string>> = {};

  for (const field of Object.keys(errors) as Field[]) {
    const message = errors[field];

    if (message !== undefined) {
      rendered[field] = render(message);
    }
  }

  return rendered;
}

export function fieldErrorsInEnglish<Field extends string>(
  errors: UserFieldErrors<Field>,
): Partial<Record<Field, string>> {
  return mapFieldErrors(errors, inEnglish);
}

/** The field errors in the install's language, for the JSON response. */
export async function localizeFieldErrors<Field extends string>(
  errors: UserFieldErrors<Field>,
): Promise<Partial<Record<Field, string>>> {
  const locale = await installLocale();

  return mapFieldErrors(errors, (message) => translateMessage(message, locale));
}
