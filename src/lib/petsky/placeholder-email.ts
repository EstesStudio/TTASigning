/**
 * A signer reached only by link may have no email address. The signer tables
 * require one (it identifies the signer within an envelope), so such a signer
 * is stored with an address under the reserved `.invalid` top-level domain
 * (RFC 2606), which can never receive mail. The email service drops messages
 * to these addresses, and the places that show an address hide them.
 */

export const PLACEHOLDER_EMAIL_DOMAIN = "sem-email.invalid";

export function placeholderEmailFor(id: string): string {
  const local = id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);

  return `signatario-${local || "x"}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
  );
}

/** The address to show a person: empty for a placeholder. */
export function displayEmail(email: string | null | undefined): string {
  return isPlaceholderEmail(email) ? "" : (email ?? "");
}
