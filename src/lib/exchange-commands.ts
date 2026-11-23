// The Exchange Online PowerShell that lets the app registration send from
// one mailbox and no other (RBAC for Applications), as Settings shows it with
// the administrator's own values filled in. docs/self-hosting.md has the same
// steps.

/** A PowerShell (or OPATH) single-quoted string: quotes inside are doubled. */
function single(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** The PowerShell an Exchange administrator runs, with the IDs filled in. */
export function buildExchangeCommands(values: {
  clientId: string;
  sender: string;
}): string {
  const typedClientId = values.clientId.trim();
  const clientId = typedClientId ? single(typedClientId) : "<client-id>";
  const address = values.sender.trim() || "sign@yourcompany.com";
  const sender = single(address);
  // The filter is OPATH inside a double-quoted PowerShell string: the
  // address is quoted for OPATH, then the whole for PowerShell.
  const filter = `"PrimarySmtpAddress -eq ${single(address).replace(/[`$"]/g, (character) => `\`${character}`)}"`;

  return [
    "Connect-ExchangeOnline",
    "",
    "# 1. The mailbox to send from. Skip if it exists already.",
    `New-Mailbox -Shared -Name "Signatures" -PrimarySmtpAddress ${sender}`,
    "",
    "# 2. The app in Exchange. Its object ID is in Entra, under Enterprise applications.",
    `New-ServicePrincipal -AppId ${clientId} -ObjectId <enterprise-app-object-id> -DisplayName "SignuDoc"`,
    "",
    "# 3. Allow it to send from that mailbox, and no other.",
    `New-ManagementScope -Name "SignuDoc sender" -RecipientRestrictionFilter ${filter}`,
    `New-ManagementRoleAssignment -App ${clientId} -Role "Application Mail.Send" -CustomResourceScope "SignuDoc sender"`,
    "",
    "# 4. Check: InScope should be True for this mailbox, and False for anyone else's.",
    `Test-ServicePrincipalAuthorization -Identity ${clientId} -Resource ${sender}`,
  ].join("\n");
}
