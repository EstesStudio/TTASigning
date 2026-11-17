"use client";

import {
  envelopeMessages,
  type EnvelopeMessages,
} from "./envelope-messages.ts";
import { useLocale } from "./use-locale.ts";

/** The sender's pages' messages in the language the install speaks. */
export function useEnvelopeMessages(): EnvelopeMessages {
  return envelopeMessages(useLocale());
}
