"use client";

import { useBranding } from "@/components/layout/branding-provider";

import { signingMessages, type SigningMessages } from "./signing-messages.ts";

/** The signing pages' messages in the language the install speaks. */
export function useSigningMessages(): SigningMessages {
  return signingMessages(useBranding().locale);
}
