"use server";

import { cookies } from "next/headers";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  isLocale,
  type Locale,
} from "./types.ts";

/** Stores the visitor's language choice without changing the current URL. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
