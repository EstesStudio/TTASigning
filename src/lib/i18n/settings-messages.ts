// What the Settings page says to the people who use the app, in each
// language an install can speak. English is written first; every other
// dictionary has its type, so the compiler lists any message it is missing.
//
// Errors worded by the server (field errors, `error` in an API answer) arrive
// already worded and are shown as they come; they are not repeated here.
// Product names, environment variable names, DNS values and the labels of
// other services' screens (Vercel, GitHub) stay as they are in every language.

import type { SystemAuditEvent } from "../services/system-audit.ts";
import type { Locale } from "./locales.ts";

type AuditEventType = SystemAuditEvent["event"];

const en = {
  common: {
    genericError: "Something went wrong. Please try again.",
    administrator: "Administrator",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    checking: "Checking...",
    sending: "Sending...",
    on: "On",
    off: "Off",
  },

  /** The signed-in person's own part of Settings. */
  account: {
    title: "Settings",
    description:
      "Manage your sender profile, password, two-step sign-in and account lifecycle.",
    profileHeading: "Profile",
    fullNameLabel: "Full name",
    emailLabel: "Email",
    emailChangeHelper:
      "Email changes are verified through your current inbox first, then the new inbox.",
    saveChanges: "Save changes",
    passwordHeading: "Password",
    currentPasswordLabel: "Current password",
    newPasswordLabel: "New password",
    newPasswordHelper: "Must be at least 15 characters",
    updating: "Updating...",
    updatePassword: "Update password",
    emailResetLink: "Email me a reset link",
    dangerZoneHeading: "Danger zone",
    requestClosure: "Request account closure",
    closureDialogTitle: "Request account closure?",
    /** What the person types to confirm; the server is always sent the English phrase. */
    closurePhrase: "close my account",
    closureConfirmLabel: 'Type "close my account" to confirm:',
    requesting: "Requesting...",
    confirmClosure: "Request closure",
    closureCopyHosted: (productName: string) =>
      `Before closing your account, download any documents you want to keep. After closure, ${productName} keeps a 30-day export window and then deletes your stored documents, templates and envelope records. Signers keep the copies they were emailed.`,
    closureCopySelfHosted: (productName: string) =>
      `Before closing your account, download any documents you want to keep. After 30 days your drafts, unfinished envelopes and templates are deleted. Finished documents and their audit trails stay with ${productName}: they move to an administrator, because they are the organization's records.`,
    errors: {
      fullNameRequired: "Enter your full name",
      emailInvalid: "Enter a valid email address",
      currentPasswordRequired: "Enter your current password",
      passwordTooShort: "Password must be at least 15 characters",
      emailTaken: "This email is already registered",
      emailUnchanged: "Enter a different email address",
      currentPasswordWrong: "Current password is incorrect",
      passwordBreached: "Choose a password that hasn't appeared in a breach",
      correctFields: "Please correct the highlighted fields.",
    },
    notices: {
      profileUpdatedEmailPending:
        "Profile updated. If the email change can proceed, you'll receive the next steps by email.",
      emailPending:
        "If the email change can proceed, you'll receive the next steps by email.",
      profileUpdated: "Profile updated.",
      passwordUpdated: "Password updated.",
      resetLinkSent: "Password reset link sent.",
      closureRequested:
        "We've received your request. Download any documents you want to keep within 30 days.",
    },
  },

  twoFactor: {
    heading: "Two-step sign-in",
    description: (productName: string) =>
      `After your password, ${productName} asks for a 6-digit code from an authenticator app on your phone, such as 1Password, Google Authenticator or Microsoft Authenticator. Someone who learns your password still cannot sign in.`,
    requiredSuffix: " Your organization requires it.",
    makeNewBackupCodes: "Make new backup codes",
    turnOffTwoStep: "Turn off two-step sign-in",
    setUp: "Set up two-step sign-in",
    passwordLabel: "Your password",
    continue: "Continue",
    makeNewCodes: "Make new codes",
    turnOff: "Turn off",
    scanStep: "Scan this code with your authenticator app.",
    typeKey: "Or type in this key:",
    saveBackupCodesStep: "2. Save your backup codes",
    enterCodeStep: "3. Enter the code your app shows",
    codeLabel: "6-digit code",
    turnOn: "Turn on two-step sign-in",
    newCodesMade: "New backup codes made. The old ones no longer work.",
    done: "Done",
    qrLabel: "QR code for your authenticator app",
    backupCodesIntro:
      "Keep these backup codes somewhere safe, such as your password manager. Each one works once, in place of a code from your app, if you lose your phone. You will not see them again.",
    backupCodesLabel: "Backup codes",
    downloadCodes: "Download codes",
    backupCodesFileName: "backup-codes.txt",
    backupCodesFileTitle: (productName: string) =>
      `${productName} backup codes`,
    backupCodesFileHint:
      "Each code works once, in place of a code from your authenticator app.",
    errors: {
      enterPassword: "Enter your password.",
      enterCode: "Enter the 6-digit code your app shows.",
      wrongPassword: "That password is not right.",
      wrongCode:
        "That code is not right. Check the time on your phone and try the newest code.",
    },
  },

  sessions: {
    heading: "Signed-in devices",
    description:
      "If you signed in on a computer that is not yours, or lost a device, sign out everywhere. Every browser signed in to your account, including this one, has to sign in again.",
    signingOut: "Signing out...",
    signOutEverywhere: "Sign out everywhere",
  },

  /** The administrator's part of Settings. */
  organization: {
    heading: "Organization",
    description:
      "These settings apply to everyone who uses this site. Only you, the administrator, can see and change them.",
    saved: "Organization settings saved.",
    nameLabel: "Organization name",
    nameHelper: "Shown in the header and in every email this site sends.",
    languageLabel: "Language",
    languageHelper:
      "The whole site uses this language: the app, the signing pages, the agreement signers accept, and every email.",
    signupHeading: "Who can create an account",
    signupDescription:
      "This is about people who send documents. People who are sent a document to sign never need an account.",
    signupModes: {
      domains: {
        label: "People at my organization",
        description:
          "Only people whose email address is at one of your domains can create an account.",
      },
      closed: {
        label: "Nobody",
        description: "Nobody new can create an account.",
      },
      open: {
        label: "Anyone",
        description: "Anyone who finds this site can create an account.",
      },
    },
    domainsLabel: "Email domains",
    domainsHelper: "Separate several domains with commas.",
    domainsPlaceholder: "yourcompany.com",
    addressesHeading: "Email addresses",
    senderLabel: "Send email from",
    senderFromEnv: "Set by the RESEND_FROM_EMAIL environment variable.",
    senderHelper:
      "The address emails come from, at a domain you own. A subdomain such as notifications@sign.yourcompany.com keeps this site's mail apart from your everyday email.",
    senderPlaceholder: "sign@yourcompany.com",
    supportLabel: "Support address",
    supportFromEnv: "Set by the SUPPORT_EMAIL environment variable.",
    supportHelper: "Where replies and questions from signers go.",
    supportPlaceholder: "help@yourcompany.com",
    legalHeading: "Your terms and privacy policy",
    legalDescription:
      "Optional. Links to pages on your own website, shown in the footer of this site and of its emails.",
    termsLabel: "Terms link",
    termsPlaceholder: "https://yourcompany.com/terms",
    privacyLabel: "Privacy policy link",
    privacyPlaceholder: "https://yourcompany.com/privacy",
    privacyNoticeBefore: "Without a privacy policy link, signers see",
    privacyNoticeLink: "a notice built from these settings",
    privacyNoticeAfter: ". Check that it is right for your organization.",
    retentionHeading: "How long to keep finished documents",
    retentionDescription:
      "Optional. After this many days a completed, declined or voided envelope is deleted with its audit trail. Its sender is emailed 30 days before. Leave empty to keep them until someone deletes them. Many records must be kept for years, so check what applies to you before setting this.",
    retentionPart11:
      "Off while Part 11 mode is on: those records are deleted by hand only.",
    retentionLabel: "Days to keep",
    retentionPlaceholder: "Keep until deleted",
    submit: "Save organization settings",
  },

  email: {
    heading: "Email setup",
    checking: "Checking email…",
    adding: "Adding...",
    setUpDomain: (domain: string) => `Set up ${domain}`,
    checkDns: "Check DNS records",
    sendTest: "Send me a test email",
    openResend: "Open Resend",
    testSent: (to: string) => `Test email sent to ${to}. Check that inbox.`,
    noKeyLine:
      "This site has no Resend API key, so it cannot send anything: no sign-up confirmations and no signing invitations.",
    notConnectedTitle: "Email is not connected",
    status: {
      captureLine:
        "This is a development setup. Emails are saved to a folder on this machine instead of being sent.",
      captureTitle: "Emails are being captured, not sent",
      vercelMarketplaceLink: "Resend on the Vercel Marketplace",
      vercelStepInstall:
        "Open Resend on the Vercel Marketplace. Choose Install (or Connect Project if your team already has Resend) and connect it to this project.",
      vercelStepCheckVariable:
        "In this project on Vercel, open Settings, then Environment Variables, and check that RESEND_API_KEY is listed for Production.",
      vercelStepRedeploy:
        "Open Deployments, open the ••• menu on the latest Production deployment and choose Redeploy. Environment variables only reach deployments made after they were added, so a site deployed before Resend was connected still has no key until it is redeployed.",
      vercelStepReload: "When the new deployment is ready, reload this page.",
      apiKeysLink: "Resend API keys",
      selfStepCreateKey:
        "Create an API key in Resend with full access, so this page can add your domain and check its DNS records.",
      selfStepSetVariable:
        "Set it as the RESEND_API_KEY environment variable where this site runs.",
      selfStepRestart: "Restart the app, then reload this page.",
      testSenderLine: (senderAddress: string) =>
        `Emails are going out from Resend's shared test address (${senderAddress}). Resend only delivers those to the owner of the Resend account, so signers and new users will not receive anything yet.`,
      testSenderHint:
        'Enter an address at your own domain in "Send email from" above and save. The DNS records to add will appear here.',
      testSenderTitle: "Email only reaches you so far",
      domainMissingLine: (domain: string) =>
        `${domain} has not been added to your Resend account yet. Set it up here to get the DNS records that prove you own it.`,
      domainMissingTitle: (domain: string) => `${domain} needs to be set up`,
      domainPendingLine: (domain: string) =>
        `Add these records where ${domain}'s DNS is managed, then check them. DNS changes can take a few minutes to be seen, and sometimes longer.`,
      domainPendingMaySend:
        "Resend has verified part of this domain, so sending may already work. Send yourself a test email to find out. If it arrives, email is working.",
      domainPendingTitle: (domain: string) =>
        `Waiting for ${domain}'s DNS records`,
      restrictedKeyLine: (domain: string) =>
        `This site's Resend key is only allowed to send email, so it cannot check ${domain} from here. Open Resend to add the domain and see its DNS records.`,
      restrictedKeyHint:
        "When that is done, send yourself a test email. If it arrives, email is working.",
      restrictedKeyTitle: "Finish the domain in Resend",
      readyLine: (senderAddress: string, domain: string) =>
        `Emails are sent from ${senderAddress}, and ${domain} is verified.`,
      readyTitle: "Email is working",
      errorLine: (message: string) =>
        `Resend could not be asked about this site's email: ${message}`,
      errorTitle: "Email could not be checked",
    },
    dns: {
      noRecords: (domain: string) =>
        `Resend did not list any records for ${domain}. Open Resend to see them.`,
      caption: (domain: string) => `DNS records to add for ${domain}`,
      type: "Type",
      name: "Name",
      value: "Value",
      status: "Status",
      priority: (priority: number) => `Priority ${String(priority)}`,
      found: "Found",
      notFound: "Not found yet",
    },
  },

  branding: {
    heading: "Logo and color",
    description:
      "Optional. Your logo goes in the header of this site, on the pages signers see and at the top of emails. Your color is used for buttons and links.",
    logoLabel: "Logo",
    noLogo: "No logo yet. The header shows your organization’s name.",
    logoInputLabel: "Logo image",
    uploading: "Uploading...",
    replaceLogo: "Replace logo",
    uploadLogo: "Upload a logo",
    removing: "Removing...",
    removeLogo: "Remove logo",
    logoHelper:
      "PNG, JPEG or WebP, up to 512 KB. A wide logo on a transparent background works best. It is saved as soon as you choose it.",
    logoWrongType: "The logo must be a PNG, JPEG or WebP image.",
    logoTooLarge: "The logo must be 512 KB or smaller.",
    colorLabel: "Brand color",
    colorPickerLabel: "Color picker",
    useDefault: "Use the default",
    previewButton: "Button",
    previewStatus: "Status",
    previewLink: "Link",
    colorDarkened:
      "This color is too light for white text to be read on it, so a darker shade of it is used.",
    colorHelper:
      "Six letters and digits, such as #1a73e8. Leave empty for the default. Saved with the button below.",
  },

  people: {
    heading: "People",
    description:
      "Everyone with an account here. Administrators can change these settings, answer signer data requests and receive the finished documents of accounts that are closed. When someone stops being an administrator, the documents they received that way move to an administrator who stays. Keep at least two, so that one person leaving does not lock everyone out.",
    loading: "Loading people...",
    searchLabel: "Find a person",
    searchPlaceholder: "Name or email",
    listLabel: "People",
    member: "Member",
    you: "You",
    emailNotConfirmed: "Email not confirmed",
    closing: "Closing",
    identityConfirmed: "Identity confirmed",
    identityNotConfirmed: "Identity not confirmed",
    signingLocked: "Signing locked",
    twoStepOn: "Two-step on",
    resetTwoStepQuestion:
      "Turn off their two-step sign-in and sign them out everywhere?",
    resetting: "Resetting...",
    reset: "Reset",
    resetTwoStepLabel: (name: string) => `Reset two-step sign-in for ${name}`,
    resetTwoStepTitle:
      "For someone who lost their phone and their backup codes.",
    resetTwoStep: "Reset two-step sign-in",
    confirmIdentityLabel: (name: string) => `Confirm ${name}'s identity`,
    confirmIdentity: "Confirm identity",
    revokeIdentityLabel: (name: string) =>
      `Take back ${name}'s identity confirmation`,
    revokeIdentity: "Take back confirmation",
    unlockSigningLabel: (name: string) => `Unlock signing for ${name}`,
    unlockSigning: "Unlock signing",
    verificationNoteLabel: "How did you check who this is?",
    verificationNotePlaceholder:
      "For example: passport seen in person, HR record 4417",
    removeAdminLabel: (name: string) => `Remove ${name} as administrator`,
    lastAdminTitle: "There has to be at least one administrator.",
    removeAdmin: "Remove as administrator",
    makeAdminLabel: (name: string) => `Make ${name} an administrator`,
    makeAdmin: "Make administrator",
    noMatch: "Nobody matches that.",
    showingFirst: (shown: number, total: number) =>
      `Showing the first ${String(shown)} of ${String(total)}. Type part of a name or an email address above to find the others.`,
  },

  security: {
    heading: "Sign-in security",
    description:
      "Two-step sign-in asks for a code from an authenticator app (such as 1Password, Google Authenticator or Microsoft Authenticator) after the password. When you require it, anyone who has not set it up is asked to do so the next time they open the app, and can do nothing else until they have. Ten wrong passwords for one email address stop sign-in for it for 15 minutes either way.",
    requiredForEveryone: "Required for everyone",
    optional: "Optional",
    stopRequiring: "Stop requiring two-step sign-in",
    require: "Require two-step sign-in",
    sessionsHeading: "Sessions",
    sessionsDescription:
      "How long someone stays signed in. A change applies to everyone who is signed in now, from their next click. Anyone can also sign out everywhere from their own Settings.",
    idleLabel: "Sign out after no use for",
    never: "Never",
    maxLabel: "Sign out at the latest after",
    maxDefault: "7 days (the default)",
    saveLimits: "Save session limits",
    limitsSaved: "Session limits saved.",
    minutes: (minutes: number) =>
      minutes < 60
        ? `${String(minutes)} minutes`
        : minutes === 60
          ? "1 hour"
          : `${String(minutes / 60)} hours`,
    hours: (hours: number) =>
      hours % 24 === 0
        ? hours === 24
          ? "1 day"
          : `${String(hours / 24)} days`
        : `${String(hours)} hours`,
    auditHeading: "Site audit trail",
    refresh: "Refresh",
    downloadCsv: "Download as CSV",
    auditDescription:
      "Sign-ins and failed sign-ins, changes to how people sign in, and changes to settings, roles, the logo, identity confirmations and signing locks. Each envelope has its own trail too, which its sender can export from the envelope's page.",
    chainIntact: (events: number) =>
      `Hash chain intact across ${String(events)} events.`,
    chainBroken: (sequence: number) =>
      `The hash chain is broken at event ${String(sequence)}: a row was changed or removed.`,
    nothingRecorded: "Nothing recorded yet.",
    events: {
      account_closure_requested: "Account closure requested",
      account_deleted: "Account deleted",
      email_domain_changed: "Email domain changed",
      identity_verification_revoked: "Identity confirmation taken back",
      identity_verified: "Identity confirmed",
      logo_changed: "Logo changed",
      part11_mode_changed: "Part 11 mode changed",
      password_changed: "Password changed",
      password_reset: "Password reset by email link",
      reauthentication_failed: "Wrong password while signing",
      role_changed: "Role changed",
      settings_changed: "Settings changed",
      sign_in_failed: "Sign-in failed",
      sign_in_locked: "Sign-in stopped after wrong passwords",
      sign_in_succeeded: "Signed in",
      sessions_revoked: "Signed out everywhere",
      signed_out: "Signed out",
      signing_locked: "Signing locked",
      signing_unlocked: "Signing unlocked",
      two_factor_backup_codes_regenerated: "New backup codes made",
      two_factor_disabled: "Two-step sign-in turned off",
      two_factor_enabled: "Two-step sign-in turned on",
      two_factor_requirement_changed: "Two-step sign-in requirement changed",
      two_factor_reset: "Two-step sign-in reset by an administrator",
    } satisfies Record<AuditEventType, string> as Record<
      AuditEventType,
      string
    >,
    signInFailureReasons: {
      ACCOUNT_TEMPORARILY_LOCKED: "second step locked after wrong codes",
      EMAIL_NOT_VERIFIED: "email address not confirmed yet",
      INVALID_BACKUP_CODE: "wrong backup code",
      INVALID_CODE: "wrong authenticator code",
      INVALID_EMAIL_OR_PASSWORD: "wrong email or password",
      TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "too many wrong codes, signed out",
    } as Record<string, string>,
    turnedOn: "Turned on",
    turnedOff: "Turned off",
    account: "Account",
    /** `from` and `to` are the stored role names, "admin" or "user". */
    roleChange: (target: string, from: string, to: string) =>
      `${target}: ${from} to ${to}`,
    wrongInARow: (count: number) => `${String(count)} wrong in a row`,
    withBackupCode: "with a backup code",
    withAuthenticator: "with an authenticator code",
    logoRemoved: "Removed",
    logoReplaced: "Replaced",
  },

  part11: {
    heading: "FDA 21 CFR Part 11 mode",
    description:
      "For regulated records. While it is on, envelopes are sent only to people with an account here whose identity an administrator has confirmed under People. Each signer gives their email address and password to open the document and again to sign, and confirms what the signature means, which is printed beside it with their name and the time. Five wrong passwords lock the account for signing and email the administrators. Finished envelopes are never deleted by the retention period or a data request, and a void needs a reason.",
    disclaimer:
      "Turning it on does not by itself make this site compliant. Your organization still validates the system, writes and follows its own procedures, trains its people and certifies its electronic signatures to the FDA.",
    turnOff: "Turn off Part 11 mode",
    turnOn: "Turn on Part 11 mode",
  },

  signerData: {
    heading: "Signer data requests",
    description:
      "When a signer asks what you hold about them, download it here. When they ask for it to be erased, you can delete every finished envelope they signed, with its files and audit trail. Signed records are often ones you must keep, so erase only when no law or open dispute requires them.",
    emailLabel: "Signer's email",
    emailPlaceholder: "jane@company.com",
    download: "Download their data (JSON)",
    confirmHelper:
      "Type the email again to confirm erasure. This cannot be undone.",
    confirmLabel: "Confirm erasure",
    erase: "Erase this signer's records",
    failed: "That request could not be completed.",
    erased: (deleted: number, drafts: number) =>
      `Deleted ${String(deleted)} finished envelope(s) and removed the signer from ${String(drafts)} draft(s).`,
    skipped: (count: number) =>
      ` ${String(count)} envelope(s) still out for signature were left alone: void them first, then erase again.`,
    kept: (count: number) =>
      ` ${String(count)} Part 11 record(s) were kept: they are deleted by hand only, once the rules that apply to them allow it.`,
  },

  updates: {
    checkFailed: "Updates could not be checked. Please try again.",
    runsVersion: "This site runs SignuDoc version",
    commit: "commit",
    publishedOn: ". New versions are published on",
    checkForUpdates: "Check for updates",
    updateAvailable: (current: string) => ` is out. This site runs ${current}.`,
    whatsNew: "What's new",
    readRelease: "Read the release on GitHub",
    upToDate: (version: string) =>
      `You are up to date. ${version} is the latest release.`,
    seeReleases: "See the releases",
    howToHeading: "How to update",
    step1Before: "In your repository",
    step1Middle: ", open the Update SignuDoc workflow and press",
    step1After: ". It also runs by itself once a week.",
    step2:
      "It opens a pull request with the new version, and Vercel builds a preview of it. Your own changes to the code are kept; if they clash with the update, the workflow says which files.",
    step3:
      "Merge the pull request. Vercel deploys it, and the build applies any database changes the new version needs.",
    openWorkflow: "Open the update workflow",
    noWorkflow:
      "No such workflow? Copies made before version 0.2.0 do not have it.",
    createFile: "Create the file",
    pasteIn: "in your repository once and paste in",
    itsContents: "its contents",
    guideBefore: ". The",
    updateGuide: "update guide",
    guideDetails: "has the details.",
    upstreamBefore:
      "Bring the new release into the repository this site is built from, then deploy it. The",
    upstreamAfter:
      "shows how, including a GitHub workflow that does it for you.",
  },
};

export type SettingsMessages = typeof en;

const fr: SettingsMessages = {
  common: {
    genericError: "Une erreur s’est produite. Veuillez réessayer.",
    administrator: "Administrateur",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement...",
    checking: "Vérification...",
    sending: "Envoi...",
    on: "Activé",
    off: "Désactivé",
  },

  account: {
    title: "Paramètres",
    description:
      "Gérez votre profil d’expéditeur, votre mot de passe, la connexion en deux étapes et la fermeture de votre compte.",
    profileHeading: "Profil",
    fullNameLabel: "Nom complet",
    emailLabel: "E-mail",
    emailChangeHelper:
      "Un changement d’adresse e-mail est d’abord confirmé depuis votre boîte actuelle, puis depuis la nouvelle.",
    saveChanges: "Enregistrer les modifications",
    passwordHeading: "Mot de passe",
    currentPasswordLabel: "Mot de passe actuel",
    newPasswordLabel: "Nouveau mot de passe",
    newPasswordHelper: "15 caractères minimum",
    updating: "Mise à jour...",
    updatePassword: "Modifier le mot de passe",
    emailResetLink: "M’envoyer un lien de réinitialisation",
    dangerZoneHeading: "Zone de danger",
    requestClosure: "Demander la fermeture du compte",
    closureDialogTitle: "Demander la fermeture du compte ?",
    closurePhrase: "fermer mon compte",
    closureConfirmLabel: "Saisissez « fermer mon compte » pour confirmer :",
    requesting: "Envoi de la demande...",
    confirmClosure: "Demander la fermeture",
    closureCopyHosted: (productName) =>
      `Avant de fermer votre compte, téléchargez les documents que vous souhaitez conserver. Après la fermeture, ${productName} laisse 30 jours pour exporter vos données, puis supprime vos documents, modèles et demandes de signature enregistrés. Les signataires gardent les copies reçues par e-mail.`,
    closureCopySelfHosted: (productName) =>
      `Avant de fermer votre compte, téléchargez les documents que vous souhaitez conserver. Au bout de 30 jours, vos brouillons, demandes de signature non terminées et modèles sont supprimés. Les documents terminés et leur piste d’audit restent dans ${productName} : ils sont transférés à un administrateur, car ce sont les archives de l’organisation.`,
    errors: {
      fullNameRequired: "Saisissez votre nom complet",
      emailInvalid: "Saisissez une adresse e-mail valide",
      currentPasswordRequired: "Saisissez votre mot de passe actuel",
      passwordTooShort: "Le mot de passe doit comporter au moins 15 caractères",
      emailTaken: "Cette adresse e-mail est déjà utilisée",
      emailUnchanged: "Saisissez une autre adresse e-mail",
      currentPasswordWrong: "Le mot de passe actuel est incorrect",
      passwordBreached:
        "Choisissez un mot de passe qui n’apparaît dans aucune fuite de données",
      correctFields: "Veuillez corriger les champs signalés.",
    },
    notices: {
      profileUpdatedEmailPending:
        "Profil mis à jour. Si le changement d’adresse e-mail peut avoir lieu, vous recevrez la marche à suivre par e-mail.",
      emailPending:
        "Si le changement d’adresse e-mail peut avoir lieu, vous recevrez la marche à suivre par e-mail.",
      profileUpdated: "Profil mis à jour.",
      passwordUpdated: "Mot de passe modifié.",
      resetLinkSent: "Lien de réinitialisation du mot de passe envoyé.",
      closureRequested:
        "Nous avons bien reçu votre demande. Téléchargez sous 30 jours les documents que vous souhaitez conserver.",
    },
  },

  twoFactor: {
    heading: "Connexion en deux étapes",
    description: (productName) =>
      `Après votre mot de passe, ${productName} demande un code à 6 chiffres affiché par une application d’authentification sur votre téléphone, comme 1Password, Google Authenticator ou Microsoft Authenticator. Une personne qui connaît votre mot de passe ne peut toujours pas se connecter.`,
    requiredSuffix: " Votre organisation l’exige.",
    makeNewBackupCodes: "Générer de nouveaux codes de secours",
    turnOffTwoStep: "Désactiver la connexion en deux étapes",
    setUp: "Configurer la connexion en deux étapes",
    passwordLabel: "Votre mot de passe",
    continue: "Continuer",
    makeNewCodes: "Générer de nouveaux codes",
    turnOff: "Désactiver",
    scanStep: "Scannez ce code avec votre application d’authentification.",
    typeKey: "Ou saisissez cette clé :",
    saveBackupCodesStep: "2. Enregistrez vos codes de secours",
    enterCodeStep: "3. Saisissez le code affiché par votre application",
    codeLabel: "Code à 6 chiffres",
    turnOn: "Activer la connexion en deux étapes",
    newCodesMade:
      "Nouveaux codes de secours générés. Les anciens ne fonctionnent plus.",
    done: "Terminé",
    qrLabel: "QR code pour votre application d’authentification",
    backupCodesIntro:
      "Conservez ces codes de secours en lieu sûr, par exemple dans votre gestionnaire de mots de passe. Si vous perdez votre téléphone, chacun remplace une fois un code de votre application. Vous ne les reverrez plus.",
    backupCodesLabel: "Codes de secours",
    downloadCodes: "Télécharger les codes",
    backupCodesFileName: "codes-de-secours.txt",
    backupCodesFileTitle: (productName) => `Codes de secours ${productName}`,
    backupCodesFileHint:
      "Chaque code fonctionne une fois, à la place d’un code de votre application d’authentification.",
    errors: {
      enterPassword: "Saisissez votre mot de passe.",
      enterCode:
        "Saisissez le code à 6 chiffres affiché par votre application.",
      wrongPassword: "Ce mot de passe est incorrect.",
      wrongCode:
        "Ce code est incorrect. Vérifiez l’heure de votre téléphone et essayez le code le plus récent.",
    },
  },

  sessions: {
    heading: "Appareils connectés",
    description:
      "Si vous vous êtes connecté sur un ordinateur qui n’est pas le vôtre ou avez perdu un appareil, déconnectez-vous partout. Chaque navigateur connecté à votre compte, y compris celui-ci, devra se reconnecter.",
    signingOut: "Déconnexion...",
    signOutEverywhere: "Se déconnecter partout",
  },

  organization: {
    heading: "Organisation",
    description:
      "Ces paramètres s’appliquent à toutes les personnes qui utilisent ce site. Vous seul, en tant qu’administrateur, pouvez les voir et les modifier.",
    saved: "Paramètres de l’organisation enregistrés.",
    nameLabel: "Nom de l’organisation",
    nameHelper:
      "Affiché dans l’en-tête et dans chaque e-mail envoyé par ce site.",
    languageLabel: "Langue",
    languageHelper:
      "Tout le site utilise cette langue : l’application, les pages de signature, les conditions acceptées par les signataires et chaque e-mail.",
    signupHeading: "Qui peut créer un compte",
    signupDescription:
      "Cela concerne les personnes qui envoient des documents. Les personnes à qui l’on envoie un document à signer n’ont jamais besoin de compte.",
    signupModes: {
      domains: {
        label: "Les personnes de mon organisation",
        description:
          "Seules les personnes dont l’adresse e-mail appartient à l’un de vos domaines peuvent créer un compte.",
      },
      closed: {
        label: "Personne",
        description: "Aucun nouveau compte ne peut être créé.",
      },
      open: {
        label: "Tout le monde",
        description: "Toute personne qui trouve ce site peut créer un compte.",
      },
    },
    domainsLabel: "Domaines e-mail",
    domainsHelper: "Séparez plusieurs domaines par des virgules.",
    domainsPlaceholder: "votre-entreprise.fr",
    addressesHeading: "Adresses e-mail",
    senderLabel: "Adresse d’expédition",
    senderFromEnv: "Définie par la variable d’environnement RESEND_FROM_EMAIL.",
    senderHelper:
      "L’adresse d’où partent les e-mails, sur un domaine qui vous appartient. Un sous-domaine comme notifications@sign.votre-entreprise.fr sépare les e-mails de ce site de votre messagerie habituelle.",
    senderPlaceholder: "signature@votre-entreprise.fr",
    supportLabel: "Adresse d’assistance",
    supportFromEnv: "Définie par la variable d’environnement SUPPORT_EMAIL.",
    supportHelper:
      "Là où arrivent les réponses et les questions des signataires.",
    supportPlaceholder: "aide@votre-entreprise.fr",
    legalHeading: "Vos conditions et votre politique de confidentialité",
    legalDescription:
      "Facultatif. Liens vers des pages de votre propre site, affichés en pied de page de ce site et de ses e-mails.",
    termsLabel: "Lien vers les conditions",
    termsPlaceholder: "https://votre-entreprise.fr/conditions",
    privacyLabel: "Lien vers la politique de confidentialité",
    privacyPlaceholder: "https://votre-entreprise.fr/confidentialite",
    privacyNoticeBefore:
      "Sans lien vers une politique de confidentialité, les signataires voient",
    privacyNoticeLink: "une notice construite à partir de ces paramètres",
    privacyNoticeAfter: ". Vérifiez qu’elle convient à votre organisation.",
    retentionHeading: "Durée de conservation des documents terminés",
    retentionDescription:
      "Facultatif. Passé ce nombre de jours, une demande de signature terminée, refusée ou annulée est supprimée avec sa piste d’audit. Son expéditeur est prévenu par e-mail 30 jours avant. Laissez vide pour les conserver jusqu’à ce que quelqu’un les supprime. De nombreux documents doivent être conservés pendant des années : vérifiez ce qui s’applique à vous avant de renseigner ce champ.",
    retentionPart11:
      "Désactivé tant que le mode Part 11 est actif : ces documents ne sont supprimés qu’à la main.",
    retentionLabel: "Jours de conservation",
    retentionPlaceholder: "Conserver jusqu’à suppression",
    submit: "Enregistrer les paramètres de l’organisation",
  },

  email: {
    heading: "Configuration des e-mails",
    checking: "Vérification des e-mails…",
    adding: "Ajout...",
    setUpDomain: (domain) => `Configurer ${domain}`,
    checkDns: "Vérifier les enregistrements DNS",
    sendTest: "M’envoyer un e-mail de test",
    openResend: "Ouvrir Resend",
    testSent: (to) =>
      `E-mail de test envoyé à ${to}. Vérifiez cette boîte de réception.`,
    noKeyLine:
      "Ce site n’a pas de clé API Resend : il ne peut rien envoyer, ni confirmations d’inscription ni invitations à signer.",
    notConnectedTitle: "Les e-mails ne sont pas connectés",
    status: {
      captureLine:
        "Il s’agit d’une installation de développement. Les e-mails sont enregistrés dans un dossier de cette machine au lieu d’être envoyés.",
      captureTitle: "Les e-mails sont capturés, pas envoyés",
      vercelMarketplaceLink: "Resend sur la Vercel Marketplace",
      vercelStepInstall:
        "Ouvrez Resend sur la Vercel Marketplace. Choisissez Install (ou Connect Project si votre équipe utilise déjà Resend) et connectez-le à ce projet.",
      vercelStepCheckVariable:
        "Dans ce projet sur Vercel, ouvrez Settings, puis Environment Variables, et vérifiez que RESEND_API_KEY figure bien pour Production.",
      vercelStepRedeploy:
        "Ouvrez Deployments, ouvrez le menu ••• du dernier déploiement Production et choisissez Redeploy. Les variables d’environnement ne s’appliquent qu’aux déploiements effectués après leur ajout : un site déployé avant la connexion de Resend n’a pas de clé tant qu’il n’est pas redéployé.",
      vercelStepReload:
        "Une fois le nouveau déploiement prêt, rechargez cette page.",
      apiKeysLink: "Clés API Resend",
      selfStepCreateKey:
        "Créez dans Resend une clé API avec un accès complet, pour que cette page puisse ajouter votre domaine et vérifier ses enregistrements DNS.",
      selfStepSetVariable:
        "Définissez-la comme variable d’environnement RESEND_API_KEY là où ce site s’exécute.",
      selfStepRestart: "Redémarrez l’application, puis rechargez cette page.",
      testSenderLine: (senderAddress) =>
        `Les e-mails partent de l’adresse de test partagée de Resend (${senderAddress}). Resend ne les remet qu’au propriétaire du compte Resend : les signataires et les nouveaux utilisateurs ne reçoivent donc encore rien.`,
      testSenderHint:
        "Saisissez une adresse sur votre propre domaine dans « Adresse d’expédition » ci-dessus et enregistrez. Les enregistrements DNS à ajouter s’afficheront ici.",
      testSenderTitle: "Pour l’instant, les e-mails n’arrivent qu’à vous",
      domainMissingLine: (domain) =>
        `${domain} n’a pas encore été ajouté à votre compte Resend. Configurez-le ici pour obtenir les enregistrements DNS qui prouvent qu’il vous appartient.`,
      domainMissingTitle: (domain) => `${domain} doit être configuré`,
      domainPendingLine: (domain) =>
        `Ajoutez ces enregistrements là où le DNS de ${domain} est géré, puis vérifiez-les. Les modifications DNS peuvent mettre quelques minutes à être visibles, parfois plus.`,
      domainPendingMaySend:
        "Resend a vérifié une partie de ce domaine : l’envoi fonctionne peut-être déjà. Envoyez-vous un e-mail de test pour le savoir. S’il arrive, les e-mails fonctionnent.",
      domainPendingTitle: (domain) =>
        `En attente des enregistrements DNS de ${domain}`,
      restrictedKeyLine: (domain) =>
        `La clé Resend de ce site n’est autorisée qu’à envoyer des e-mails : elle ne peut pas vérifier ${domain} d’ici. Ouvrez Resend pour ajouter le domaine et voir ses enregistrements DNS.`,
      restrictedKeyHint:
        "Une fois cela fait, envoyez-vous un e-mail de test. S’il arrive, les e-mails fonctionnent.",
      restrictedKeyTitle: "Terminez la configuration du domaine dans Resend",
      readyLine: (senderAddress, domain) =>
        `Les e-mails partent de ${senderAddress}, et ${domain} est vérifié.`,
      readyTitle: "Les e-mails fonctionnent",
      errorLine: (message) =>
        `Impossible d’interroger Resend sur les e-mails de ce site : ${message}`,
      errorTitle: "Les e-mails n’ont pas pu être vérifiés",
    },
    dns: {
      noRecords: (domain) =>
        `Resend n’a indiqué aucun enregistrement pour ${domain}. Ouvrez Resend pour les voir.`,
      caption: (domain) => `Enregistrements DNS à ajouter pour ${domain}`,
      type: "Type",
      name: "Nom",
      value: "Valeur",
      status: "État",
      priority: (priority) => `Priorité ${String(priority)}`,
      found: "Trouvé",
      notFound: "Pas encore trouvé",
    },
  },

  branding: {
    heading: "Logo et couleur",
    description:
      "Facultatif. Votre logo figure dans l’en-tête de ce site, sur les pages vues par les signataires et en haut des e-mails. Votre couleur est utilisée pour les boutons et les liens.",
    logoLabel: "Logo",
    noLogo:
      "Pas encore de logo. L’en-tête affiche le nom de votre organisation.",
    logoInputLabel: "Image du logo",
    uploading: "Envoi...",
    replaceLogo: "Remplacer le logo",
    uploadLogo: "Importer un logo",
    removing: "Suppression...",
    removeLogo: "Supprimer le logo",
    logoHelper:
      "PNG, JPEG ou WebP, 512 Ko maximum. Un logo horizontal sur fond transparent donne le meilleur résultat. Il est enregistré dès que vous le choisissez.",
    logoWrongType: "Le logo doit être une image PNG, JPEG ou WebP.",
    logoTooLarge: "Le logo ne doit pas dépasser 512 Ko.",
    colorLabel: "Couleur de la marque",
    colorPickerLabel: "Sélecteur de couleur",
    useDefault: "Utiliser la couleur par défaut",
    previewButton: "Bouton",
    previewStatus: "Statut",
    previewLink: "Lien",
    colorDarkened:
      "Cette couleur est trop claire pour y lire du texte blanc : une nuance plus foncée est utilisée.",
    colorHelper:
      "Six lettres et chiffres, par exemple #1a73e8. Laissez vide pour la couleur par défaut. Enregistrée avec le bouton ci-dessous.",
  },

  people: {
    heading: "Utilisateurs",
    description:
      "Toutes les personnes qui ont un compte ici. Les administrateurs peuvent modifier ces paramètres, répondre aux demandes des signataires sur leurs données et reçoivent les documents terminés des comptes fermés. Quand quelqu’un cesse d’être administrateur, les documents reçus à ce titre passent à un administrateur qui reste. Gardez-en au moins deux, pour que le départ d’une personne ne bloque pas tout le monde.",
    loading: "Chargement des utilisateurs...",
    searchLabel: "Rechercher un utilisateur",
    searchPlaceholder: "Nom ou e-mail",
    listLabel: "Utilisateurs",
    member: "Membre",
    you: "Vous",
    emailNotConfirmed: "E-mail non confirmé",
    closing: "Fermeture en cours",
    identityConfirmed: "Identité confirmée",
    identityNotConfirmed: "Identité non confirmée",
    signingLocked: "Signature bloquée",
    twoStepOn: "Deux étapes activées",
    resetTwoStepQuestion:
      "Désactiver sa connexion en deux étapes et le déconnecter partout ?",
    resetting: "Réinitialisation...",
    reset: "Réinitialiser",
    resetTwoStepLabel: (name) =>
      `Réinitialiser la connexion en deux étapes de ${name}`,
    resetTwoStepTitle:
      "Pour quelqu’un qui a perdu son téléphone et ses codes de secours.",
    resetTwoStep: "Réinitialiser la connexion en deux étapes",
    confirmIdentityLabel: (name) => `Confirmer l’identité de ${name}`,
    confirmIdentity: "Confirmer l’identité",
    revokeIdentityLabel: (name) =>
      `Retirer la confirmation d’identité de ${name}`,
    revokeIdentity: "Retirer la confirmation",
    unlockSigningLabel: (name) => `Débloquer la signature pour ${name}`,
    unlockSigning: "Débloquer la signature",
    verificationNoteLabel: "Comment avez-vous vérifié de qui il s’agit ?",
    verificationNotePlaceholder:
      "Par exemple : passeport vu en personne, dossier RH 4417",
    removeAdminLabel: (name) => `Retirer le rôle d’administrateur à ${name}`,
    lastAdminTitle: "Il doit y avoir au moins un administrateur.",
    removeAdmin: "Retirer le rôle d’administrateur",
    makeAdminLabel: (name) => `Nommer ${name} administrateur`,
    makeAdmin: "Nommer administrateur",
    noMatch: "Aucun résultat.",
    showingFirst: (shown, total) =>
      `Affichage des ${String(shown)} premiers sur ${String(total)}. Saisissez une partie d’un nom ou d’une adresse e-mail ci-dessus pour trouver les autres.`,
  },

  security: {
    heading: "Sécurité de la connexion",
    description:
      "La connexion en deux étapes demande, après le mot de passe, un code issu d’une application d’authentification (comme 1Password, Google Authenticator ou Microsoft Authenticator). Si vous l’exigez, chaque personne qui ne l’a pas configurée doit le faire à sa prochaine ouverture de l’application et ne peut rien faire d’autre avant. Dans tous les cas, dix mots de passe erronés pour une même adresse e-mail bloquent la connexion à ce compte pendant 15 minutes.",
    requiredForEveryone: "Exigée pour tous",
    optional: "Facultative",
    stopRequiring: "Ne plus exiger la connexion en deux étapes",
    require: "Exiger la connexion en deux étapes",
    sessionsHeading: "Sessions",
    sessionsDescription:
      "Durée pendant laquelle une personne reste connectée. Un changement s’applique à toutes les personnes connectées, dès leur prochain clic. Chacun peut aussi se déconnecter partout depuis ses propres paramètres.",
    idleLabel: "Déconnecter après une inactivité de",
    never: "Jamais",
    maxLabel: "Déconnecter au plus tard après",
    maxDefault: "7 jours (par défaut)",
    saveLimits: "Enregistrer les limites de session",
    limitsSaved: "Limites de session enregistrées.",
    minutes: (minutes) =>
      minutes < 60
        ? `${String(minutes)} minutes`
        : minutes === 60
          ? "1 heure"
          : `${String(minutes / 60)} heures`,
    hours: (hours) =>
      hours % 24 === 0
        ? hours === 24
          ? "1 jour"
          : `${String(hours / 24)} jours`
        : `${String(hours)} heures`,
    auditHeading: "Piste d’audit du site",
    refresh: "Actualiser",
    downloadCsv: "Télécharger en CSV",
    auditDescription:
      "Connexions et échecs de connexion, changements de mode de connexion, et modifications des paramètres, des rôles, du logo, des confirmations d’identité et des blocages de signature. Chaque demande de signature a aussi sa propre piste, que son expéditeur peut exporter depuis la page de la demande.",
    chainIntact: (events) =>
      `Chaîne de hachage intacte sur ${String(events)} événements.`,
    chainBroken: (sequence) =>
      `La chaîne de hachage est rompue à l’événement ${String(sequence)} : une ligne a été modifiée ou supprimée.`,
    nothingRecorded: "Rien d’enregistré pour l’instant.",
    events: {
      account_closure_requested: "Fermeture de compte demandée",
      account_deleted: "Compte supprimé",
      email_domain_changed: "Domaine e-mail modifié",
      identity_verification_revoked: "Confirmation d’identité retirée",
      identity_verified: "Identité confirmée",
      logo_changed: "Logo modifié",
      part11_mode_changed: "Mode Part 11 modifié",
      password_changed: "Mot de passe modifié",
      password_reset: "Mot de passe réinitialisé par lien e-mail",
      reauthentication_failed: "Mot de passe erroné lors d’une signature",
      role_changed: "Rôle modifié",
      settings_changed: "Paramètres modifiés",
      sign_in_failed: "Échec de connexion",
      sign_in_locked: "Connexion bloquée après des mots de passe erronés",
      sign_in_succeeded: "Connexion",
      sessions_revoked: "Déconnexion partout",
      signed_out: "Déconnexion",
      signing_locked: "Signature bloquée",
      signing_unlocked: "Signature débloquée",
      two_factor_backup_codes_regenerated: "Nouveaux codes de secours générés",
      two_factor_disabled: "Connexion en deux étapes désactivée",
      two_factor_enabled: "Connexion en deux étapes activée",
      two_factor_requirement_changed:
        "Exigence de connexion en deux étapes modifiée",
      two_factor_reset:
        "Connexion en deux étapes réinitialisée par un administrateur",
    },
    signInFailureReasons: {
      ACCOUNT_TEMPORARILY_LOCKED:
        "deuxième étape bloquée après des codes erronés",
      EMAIL_NOT_VERIFIED: "adresse e-mail pas encore confirmée",
      INVALID_BACKUP_CODE: "code de secours erroné",
      INVALID_CODE: "code d’authentification erroné",
      INVALID_EMAIL_OR_PASSWORD: "e-mail ou mot de passe erroné",
      TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "trop de codes erronés, déconnecté",
    },
    turnedOn: "Activé",
    turnedOff: "Désactivé",
    account: "Compte",
    roleChange: (target, from, to) =>
      `${target} : ${frenchRole(from)} → ${frenchRole(to)}`,
    wrongInARow: (count) =>
      count === 1 ? "1 erreur" : `${String(count)} erreurs consécutives`,
    withBackupCode: "avec un code de secours",
    withAuthenticator: "avec un code d’authentification",
    logoRemoved: "Supprimé",
    logoReplaced: "Remplacé",
  },

  part11: {
    heading: "Mode FDA 21 CFR Part 11",
    description:
      "Pour les documents réglementés. Tant qu’il est actif, les demandes de signature ne sont envoyées qu’à des personnes ayant un compte ici et dont un administrateur a confirmé l’identité dans Utilisateurs. Chaque signataire saisit son adresse e-mail et son mot de passe pour ouvrir le document, puis à nouveau pour signer, et confirme la signification de sa signature, imprimée à côté avec son nom et l’heure. Cinq mots de passe erronés bloquent la signature pour ce compte et préviennent les administrateurs par e-mail. Les demandes de signature terminées ne sont jamais supprimées par la durée de conservation ni par une demande sur les données, et une annulation doit être motivée.",
    disclaimer:
      "L’activer ne rend pas à lui seul ce site conforme. Votre organisation doit toujours valider le système, rédiger et suivre ses propres procédures, former ses équipes et certifier ses signatures électroniques auprès de la FDA.",
    turnOff: "Désactiver le mode Part 11",
    turnOn: "Activer le mode Part 11",
  },

  signerData: {
    heading: "Demandes des signataires sur leurs données",
    description:
      "Quand un signataire demande ce que vous détenez à son sujet, téléchargez-le ici. S’il demande l’effacement, vous pouvez supprimer toutes les demandes de signature terminées qu’il a signées, avec leurs fichiers et leur piste d’audit. Les documents signés doivent souvent être conservés : n’effacez que si aucune loi ni aucun litige en cours ne l’impose.",
    emailLabel: "E-mail du signataire",
    emailPlaceholder: "marie@entreprise.fr",
    download: "Télécharger ses données (JSON)",
    confirmHelper:
      "Saisissez à nouveau l’adresse e-mail pour confirmer l’effacement. Cette action est irréversible.",
    confirmLabel: "Confirmer l’effacement",
    erase: "Effacer les données de ce signataire",
    failed: "La demande n’a pas pu aboutir.",
    erased: (deleted, drafts) =>
      `${deleted === 1 ? "1 demande de signature terminée supprimée" : `${String(deleted)} demandes de signature terminées supprimées`} ; signataire retiré de ${drafts === 1 ? "1 brouillon" : `${String(drafts)} brouillons`}.`,
    skipped: (count) =>
      count === 1
        ? " 1 demande de signature encore en cours n’a pas été touchée : annulez-la d’abord, puis relancez l’effacement."
        : ` ${String(count)} demandes de signature encore en cours n’ont pas été touchées : annulez-les d’abord, puis relancez l’effacement.`,
    kept: (count) =>
      count === 1
        ? " 1 document Part 11 a été conservé : il ne peut être supprimé qu’à la main, une fois que les règles qui s’y appliquent le permettent."
        : ` ${String(count)} documents Part 11 ont été conservés : ils ne peuvent être supprimés qu’à la main, une fois que les règles qui s’y appliquent le permettent.`,
  },

  updates: {
    checkFailed: "Impossible de vérifier les mises à jour. Veuillez réessayer.",
    runsVersion: "Ce site utilise SignuDoc version",
    commit: "commit",
    publishedOn: ". Les nouvelles versions sont publiées sur",
    checkForUpdates: "Rechercher des mises à jour",
    updateAvailable: (current) =>
      ` est disponible. Ce site utilise la version ${current}.`,
    whatsNew: "Nouveautés",
    readRelease: "Lire les notes de version sur GitHub",
    upToDate: (version) =>
      `Vous êtes à jour. ${version} est la dernière version.`,
    seeReleases: "Voir les versions",
    howToHeading: "Comment mettre à jour",
    step1Before: "Dans votre dépôt",
    step1Middle: ", ouvrez le workflow Update SignuDoc et cliquez sur",
    step1After: ". Il s’exécute aussi automatiquement une fois par semaine.",
    step2:
      "Il ouvre une pull request avec la nouvelle version, et Vercel en construit un aperçu. Vos propres modifications du code sont conservées ; si elles entrent en conflit avec la mise à jour, le workflow indique quels fichiers.",
    step3:
      "Fusionnez la pull request. Vercel la déploie, et le build applique les modifications de base de données dont la nouvelle version a besoin.",
    openWorkflow: "Ouvrir le workflow de mise à jour",
    noWorkflow:
      "Pas de workflow ? Les copies créées avant la version 0.2.0 ne l’ont pas.",
    createFile: "Créez le fichier",
    pasteIn: "une fois dans votre dépôt et collez-y",
    itsContents: "son contenu",
    guideBefore: ". Le",
    updateGuide: "guide de mise à jour",
    guideDetails: "donne tous les détails.",
    upstreamBefore:
      "Intégrez la nouvelle version au dépôt à partir duquel ce site est construit, puis déployez-la. Le",
    upstreamAfter:
      "explique comment, y compris avec un workflow GitHub qui s’en charge pour vous.",
  },
};

function frenchRole(role: string): string {
  return role === "admin"
    ? "administrateur"
    : role === "user"
      ? "membre"
      : role;
}

const dictionaries: Record<Locale, SettingsMessages> = { en, fr };

/** The Settings page's messages in the install's language. */
export function settingsMessages(locale: Locale): SettingsMessages {
  return dictionaries[locale] ?? en;
}
