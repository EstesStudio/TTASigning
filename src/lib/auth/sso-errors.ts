// Error messages for single sign-on redirects back to /login?error=<code>.
// Kept free of server-only imports so both client components and unit tests
// can use it directly.

export type PasswordSignInMode = "fallback" | "off" | "on";

/** What the sign-in page says for an ?error= the provider callback sent. */
export function describeSsoError(
  code: string,
  options?: { passwordSignIn?: PasswordSignInMode },
): string {
  switch (code) {
    case "signup_closed":
    case "signup_domain_not_allowed":
      return "That address does not have an account here, and this site's sign-up rule does not let it make one. Ask an administrator.";
    case "access_denied":
      return "Sign-in was cancelled.";
    case "email_not_found":
      return "Your identity provider did not share an email address, so you could not be signed in. Ask your IT team to include the email claim.";
    case "account_not_linked":
    case "unable_to_link_account":
    case "email_not_verified":
      return (options?.passwordSignIn ?? "on") === "on"
        ? "An account with this address already exists here, and its email address must be confirmed before you can use single sign-on. Open your verification email to confirm your address, or log in with your password to send a fresh link, then try single sign-on again. If your address is already confirmed, ask an administrator."
        : "An account with this address already exists here, and its email address must be confirmed before you can use single sign-on. Open your verification email to confirm your address, then try single sign-on again. If your address is already confirmed, ask an administrator.";
    case "account_already_linked_to_different_user":
      return "This sign-in is already tied to a different account here. Ask an administrator.";
    default:
      return "Single sign-on did not finish. Please try again.";
  }
}
