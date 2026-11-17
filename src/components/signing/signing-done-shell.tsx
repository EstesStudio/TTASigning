import { Brand } from "@/components/layout/brand";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import type { Locale } from "@/lib/i18n/locales";
import { signingMessages } from "@/lib/i18n/signing-messages";

type SigningDoneShellProps = {
  envelopeTitle?: string | null;
  locale: Locale;
};

export function SigningDoneShell({
  envelopeTitle,
  locale,
}: SigningDoneShellProps) {
  const messages = signingMessages(locale);
  const copy = messages.done;
  const resolvedEnvelopeTitle =
    envelopeTitle && envelopeTitle.trim().length > 0
      ? envelopeTitle.trim()
      : copy.fallbackTitle;

  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <div className="page-width flex items-center py-4">
          <Brand href="/" />
        </div>
      </header>

      <main className="page-width flex flex-1 items-center justify-center py-10">
        <section
          className="panel w-full max-w-[640px] px-6 py-12 text-center sm:px-12 sm:py-16"
          data-animate="enter"
        >
          <div
            aria-hidden="true"
            className="mx-auto inline-flex size-[4.5rem] items-center justify-center rounded-full bg-(--success-soft)"
          >
            <svg
              className="size-9 text-(--success)"
              fill="none"
              viewBox="0 0 36 36"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 18.5L15.25 23.75L26.5 12.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </svg>
          </div>

          <h1 className="mt-7 text-[clamp(1.875rem,4.5vw,2.375rem)] font-extrabold tracking-[-0.035em] text-(--fg)">
            {copy.heading}
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-base leading-7 text-(--secondary)">
            {copy.recordedPrefix}{" "}
            <span className="font-bold text-(--fg)">
              {copy.quotedTitle(resolvedEnvelopeTitle)}
            </span>
            {copy.recordedSuffix}
          </p>
          <p className="mx-auto mt-3 max-w-[480px] text-base leading-7 text-(--secondary)">
            {copy.emailNotice}
          </p>
          <p className="mt-8 inline-flex rounded-full bg-(--surface) px-4 py-2 text-sm font-semibold text-(--secondary)">
            {copy.closeTab}
          </p>
        </section>
      </main>

      <PublicLegalFooter labels={messages.footer} />
    </div>
  );
}
