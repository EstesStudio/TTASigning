import { useId, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n/locales";

// A small flag beside each language in Settings. Drawn as SVG because
// Windows shows flag emoji as two letters. Decorative: the language's name
// is always written next to it.

const FLAGS: Record<Locale, (id: string) => ReactNode> = {
  // United Kingdom, cropped from 2:1 to the frame's 3:2 around its centre.
  en: (id) => (
    <svg
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 60 30"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id={`${id}-saltire`}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <path d="M0 0h60v30H0z" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
      <path
        clipPath={`url(#${id}-saltire)`}
        d="M0 0l60 30m0-30L0 30"
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
  // France, a vertical tricolour (3:2).
  fr: () => (
    <svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0h1v2H0z" fill="#0055A4" />
      <path d="M1 0h1v2H1z" fill="#fff" />
      <path d="M2 0h1v2H2z" fill="#EF4135" />
    </svg>
  ),
};

export function LocaleFlag({
  className = "",
  locale,
}: {
  className?: string;
  locale: Locale;
}) {
  const id = useId().replace(/:/g, "");

  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-(--border-strong) [&>svg]:size-full ${className}`}
    >
      {FLAGS[locale](id)}
    </span>
  );
}
