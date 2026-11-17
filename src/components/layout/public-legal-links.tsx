"use client";

import Link from "next/link";

import { useBranding } from "@/components/layout/branding-provider";
import { SIGNUDOC_NAME, SIGNUDOC_URL } from "@/lib/branding";
import { PUBLIC_COPYRIGHT_YEAR, publicFooterLinks } from "@/lib/legal";
import { cn } from "@/lib/cn";
import { useAppMessages } from "@/lib/i18n/use-app-messages";
import { PERMITTED_USE_PATH } from "@/lib/permitted-uses";

/** The footer's words, for a page that speaks the install's language. */
export type PublicLegalFooterLabels = {
  navLabel: string;
  permittedUseLong: string;
  permittedUseShort: string;
  poweredBy: (name: string) => string;
  privacyNoticeLong: string;
  privacyPolicyLong: string;
  privacyShort: string;
  termsLong: string;
  termsShort: string;
};

type PublicLegalFooterProps = {
  className?: string;
  contentClassName?: string;
  /**
   * Set by the signing pages, which bring their own words. Left out, the
   * footer speaks the install's language. The hosted service's own legal
   * pages keep their English names either way.
   */
  labels?: PublicLegalFooterLabels;
  labelVariant?: "long" | "short";
  linkClassName?: string;
};

type FooterLink = {
  external: boolean;
  href: string;
  label: string;
};

export function PublicLegalFooter({
  className = "",
  contentClassName = "",
  labels: labelsOverride,
  labelVariant = "short",
  linkClassName,
}: PublicLegalFooterProps) {
  const branding = useBranding();
  const appLabels = useAppMessages().footer;
  const labels = labelsOverride ?? appLabels;
  const resolvedLinkClassName =
    linkClassName ??
    "text-[0.8125rem] font-medium text-(--tertiary) transition-colors hover:text-(--accent-ink)";
  // The hosted service links to its own pages. Any other install links to
  // whatever terms and privacy policy its organization has published.
  const links: FooterLink[] = branding.hosted
    ? publicFooterLinks.map((link) => ({
        external: false,
        href: link.href,
        label: labelVariant === "long" ? link.longLabel : link.shortLabel,
      }))
    : [
        ...(branding.termsUrl
          ? [
              {
                external: true,
                href: branding.termsUrl,
                label:
                  labelVariant === "long"
                    ? labels.termsLong
                    : labels.termsShort,
              },
            ]
          : []),
        // Without the organization's own policy, signers still get a
        // notice, built from the install's settings.
        branding.privacyUrl
          ? {
              external: true,
              href: branding.privacyUrl,
              label:
                labelVariant === "long"
                  ? labels.privacyPolicyLong
                  : labels.privacyShort,
            }
          : {
              external: false,
              href: "/signer-privacy",
              label:
                labelVariant === "long"
                  ? labels.privacyNoticeLong
                  : labels.privacyShort,
            },
      ];

  // Which documents may be signed here: on every install.
  links.push({
    external: false,
    href: PERMITTED_USE_PATH,
    label:
      labelVariant === "long"
        ? labels.permittedUseLong
        : labels.permittedUseShort,
  });

  return (
    <footer className={cn("relative z-10", className)}>
      <div className={cn("page-width py-7", contentClassName)}>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[0.8125rem] text-(--tertiary)">
            © {PUBLIC_COPYRIGHT_YEAR} {branding.productName}
          </p>

          {links.length > 0 ? (
            <nav
              aria-label={labels.navLabel}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {links.map((link) =>
                link.external ? (
                  <a
                    className={resolvedLinkClassName}
                    href={link.href}
                    key={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    className={resolvedLinkClassName}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          ) : null}

          {branding.hosted ? null : (
            <a
              className={resolvedLinkClassName}
              href={SIGNUDOC_URL}
              rel="noreferrer"
              target="_blank"
            >
              {labels.poweredBy(SIGNUDOC_NAME)}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
