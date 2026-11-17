import { MAX_RADIO_GROUP_BUTTONS } from "../field-choices.ts";
import { type Locale } from "./locales.ts";

// The messages the server sends back for the browser to show as they are:
// the `error` of a JSON response and the problems found in a form. They are
// written in the install's language. What the server keeps for itself (the
// audit trail, logs, stored records) stays in English.
//
// An error that reaches the browser carries its message as a `UserMessage`:
// a function that picks the words from the dictionary. Its `message` is the
// English text, so logs and tests read as before, and a route turns it into
// the install's language with `localize` (server-locale.ts).
//
// The problems a form schema finds come back from zod as English strings.
// Each one is in `validation`, and `translateMessage` finds its translation
// by the English text.

const NBSP = "\u00a0";

// "@a.com, @b.com or @c.com", with the language's own "or".
function listWithOr(items: readonly string[], or: string): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  return `${items.slice(0, -1).join(", ")} ${or} ${items[items.length - 1]}`;
}

const en = {
  /** Fallbacks and refusals written in the route handlers themselves. */
  api: {
    tooManyRequests: "Too many requests. Please try again soon.",
  },

  /** What a signer is told on the signing page. */
  signing: {
    alreadySigned: "You've already signed.",
    envelopeDeclined: "This envelope has been declined.",
    envelopeVoided: "This envelope has been voided.",
    linkExpired: "This link has expired.",
    linkNoLongerActive: "This signing link is no longer active.",
    confirmIdentity: "Confirm your identity to open this document.",
    drawnSignatureNotPng: "Drawn signatures must be submitted as PNG images.",
    drawnSignatureTooLarge: "Drawn signature image data is too large.",
    drawnSignatureEmpty: "Drawn signature image data is empty.",
    oneRadioPerGroup: "Choose only one option in each group of radio buttons.",
    completeRequiredFields: "Complete all required fields before finishing.",
    completedSignerWithoutId: "Completed signer records must include an id.",
    noCodeNeeded: "No code is needed for this link.",
    checkNotNeeded: "This check is not needed.",
    codeExpired: "That code has expired. Send a new one.",
    codeWrong: "That code is not right.",
    disclosureChanged:
      "The disclosure has changed. Reload the page to read the current one.",
    part11NoAccount:
      "This document was sent for Part 11 signatures but has no account or meaning for you. Ask the sender to send it again.",
    enterCredentials: "Enter your email address and password to sign.",
    identityNotConfirmed:
      "Your account cannot sign this document right now: an administrator has to confirm your identity, and your email address must be confirmed. Ask the sender or an administrator.",
    accountLocked: (attempts: number) =>
      `This account is locked for signing after ${String(attempts)} wrong passwords. Ask an administrator to unlock it.`,
    wrongCredentials: (attemptsLeft: number) =>
      `That email address or password is not right. ${String(attemptsLeft)} ${attemptsLeft === 1 ? "try is" : "tries are"} left before the account is locked for signing.`,
    documentChanged:
      "The document changed while you were signing. Open your signing link again.",
    sessionEnded: "This signing session has ended.",
    noSignableFields: "No signable fields are assigned to this signer.",
    fieldSubmittedTwice: "Each field can only be submitted once.",
    notProviderSigned:
      "This document is not signed through a signing provider.",
    ownCertificate:
      "This document is signed with a certificate in your own name. Continue from the signing page.",
    consentRequired:
      "Agree to use electronic records and signatures before signing.",
    routingOutOfSync: "Envelope routing is out of sync for the next signer.",
    unableToSaveFieldValues: "Unable to save one or more field values.",
    unableToActivateNextSigner:
      "Unable to activate the next signer for this envelope.",
    sourceDocumentMissing:
      "The source document for this envelope could not be found.",
    unableToFinalize: "Unable to finalize this completed envelope.",
    changedWhileDeclining:
      "This envelope changed while you were declining. Open your signing link again.",
    providerNeedsAppUrl:
      "Signing with a provider needs the install's public address (APP_URL).",
    providerNotSetUp:
      "The signing provider this document was sent with is not set up any more. Ask the sender to send it again.",
    providerCouldNotStart: (provider: string) =>
      `${provider} could not start the signature. Try again in a moment.`,
    storedSignedDocumentChanged:
      "The signed document stored for this envelope has changed. Ask the sender for help.",
    storedDocumentMismatch:
      "The stored document no longer matches the one that was sent for signing.",

    // Written in the signing routes.
    invalidSubmission: "Invalid signing submission.",
    unableToFinish: "Unable to finish signing.",
    invalidDecline: "Invalid decline request.",
    unableToDecline: "Unable to decline this document.",
    unableToLoadLink: "Unable to load this signing link.",
    unableToLoadDocument: "Unable to load this document.",
    unableToStart: "Unable to start signing.",
    invalidRequest: "Invalid request.",
    consentNotSaved: "Your agreement could not be saved right now.",
    enterCode: "Enter the code.",
    tooManyTries: "Too many tries. Wait a few minutes and try again.",
    codeNotChecked: "The code could not be checked right now.",
    tooManyCodes: "Several codes were sent already. Check your email.",
    codeNotSent: "The code could not be sent right now.",
  },

  /** Messages of the form schemas, looked up by their English text. */
  validation: {
    duplicateSignerEmail: "Each signer must have a unique email address.",
    duplicateCopyRecipientEmail:
      "This address is already a signer or a copy recipient.",
    uniqueRoutingOrder: "Each signer must have a unique routing order",
    missingCorrectedSignerFields: "Provide a name, an email address, or both.",
    duplicateRoleName: "Give each signer in the template a different name.",
    uniqueTemplateSigner: "Each signer in the template must be unique.",
    onlyDropdownsHaveChoices: "Only dropdown fields have choices",
    distinctChoices: "Each choice in a dropdown must be different",
    radioNeedsGroup: "A radio button must belong to a group",
    onlyRadiosInGroups: "Only radio buttons belong to a group",
    fieldTooWide: "Field width extends beyond the page bounds",
    fieldTooTall: "Field height extends beyond the page bounds",
    alwaysRequired: {
      signature: "signature fields are always required",
      initials: "initials fields are always required",
      date: "date fields are always required",
    },
    radioGroupMismatch:
      "The buttons in a radio group must have the same signer and be required or optional together",
    radioGroupTooLarge: `A radio group can have at most ${String(MAX_RADIO_GROUP_BUTTONS)} buttons`,
    drawnSignatureTooLarge: "Drawn signature image data is too large.",
    numberEntry: "Enter a number, such as 1250 or 12.5.",
    dropdownEntry: "Choose one of the listed options in each dropdown.",
  },

  envelope: {
    emailNotConnected:
      "Email is not set up yet, so signers can't be emailed. An administrator can finish email setup in Settings, Organization.",
    notFound: "Envelope not found.",
    draftCannotBeCopied: "Draft envelopes cannot be copied.",
    documentGoneCannotCopy:
      "This envelope's document is no longer available, so it cannot be copied.",
    cannotBeCopied: "This envelope cannot be copied.",
    sourcePdfUnavailable: "Source PDF is unavailable.",
    noThumbnailYet: "This document has no thumbnail yet.",
    onlyDraftsUpdated: "Only draft envelopes can be updated.",
    onlyDraftsSent: "Only draft envelopes can be sent.",
    onlyDraftsDeleted: "Only draft envelopes can be deleted.",
    draftNoLongerDeletable: "This draft envelope can no longer be deleted.",
    addSignersAndFields:
      "Add signers and place fields before sending this envelope.",
    addSigners: "Add signers before sending this envelope.",
    fieldNeedsExistingSigner:
      "Each field must be assigned to an existing signer on this envelope.",
    fieldNeedsExistingPage:
      "Each field must be placed on an existing page in this document.",
    fieldUnique: "Each field must be unique.",
    signerUnique: "Each signer must be unique.",
    copyRecipientUnique: "Each copy recipient must be unique.",
    signerMissingSignature: (name: string) =>
      `Every signer must have at least one Signature field before sending. ${name} is missing one.`,
    dropdownNeedsChoices: (signerName: string) =>
      `A dropdown for ${signerName} needs at least two choices. Select it and add them.`,
    radioButtonAlone: (signerName: string) =>
      `A radio button for ${signerName} is on its own. Add another button to its group, or remove it.`,
    aSigner: "a signer",
    noSigningProvider:
      "This install has no signing provider for advanced or qualified signatures.",
    part11SimpleSignaturesOnly:
      "Part 11 mode signs with the signers' accounts. Send with simple signatures.",
    part11SignerCannotSign: "A signer cannot sign in Part 11 mode.",
    part11Signer: {
      needsAccount: (p: { email: string; name: string }) =>
        `${p.name} (${p.email}) needs an account on this site before they can sign. Part 11 mode only lets people sign with their own account.`,
      emailNotConfirmed: (name: string) =>
        `${name} has not confirmed their email address yet.`,
      identityNotConfirmed: (name: string) =>
        `An administrator has to confirm ${name}'s identity under Settings, People before they can sign.`,
      lockedForSigning: (name: string) =>
        `${name}'s account is locked for signing after too many wrong passwords. An administrator can unlock it under Settings, People.`,
      chooseMeaning: (name: string) =>
        `Choose what ${name}'s signature means (approval, review, responsibility or authorship).`,
    },
    sourceDocumentMissing:
      "The source document for this envelope could not be found.",
    alreadySent: "This envelope has already been sent.",
    changedWhileSending:
      "This envelope was changed while it was being sent. Check it and send it again.",
    unableToActivateFirstSigner:
      "Unable to activate the first signer for this envelope.",
    noDeadlineToChange:
      "Only an envelope that is out for signature has a deadline to change.",
    deadlinePassed: (date: string) =>
      `This request expired on ${date}. Set a new deadline first.`,
    onlySentSignerCorrection:
      "Only an envelope that is out for signature can have a signer corrected.",
    part11SignerBound:
      "This envelope was sent in Part 11 mode. The signer's identity is bound to their account and cannot be corrected.",
    signedCannotBeCorrected:
      "This person has already signed and cannot be corrected.",
    declinedCannotBeCorrected:
      "This person has already declined and cannot be corrected.",
    finishedCannotBeCorrected:
      "This person has already signed or declined and cannot be corrected.",
    onlySentVoided: "Only sent envelopes can be voided.",
    voidReasonRequired:
      "Give a reason for voiding. Part 11 records keep it in the audit trail.",
    noLongerVoidable: "This envelope can no longer be voided.",

    reminder: {
      unavailable: "This envelope is unavailable.",
      onlySent: "Only sent envelopes can receive reminders.",
      notWaiting: "This envelope is no longer waiting on a signer.",
      expired: (date: string) =>
        `This request expired on ${date}. Set a new deadline before sending a reminder.`,
      deadlineJustChanged: "This envelope's deadline just changed. Try again.",
      automaticOff: "Automatic reminders are off for this envelope.",
      notDueYet: "This envelope's next reminder is not due yet.",
      availableAfter: (date: string) =>
        `You can send another reminder after ${date}.`,
    },

    /** Refusals and fallbacks of the envelope routes. */
    api: {
      auditExportFailed: "The audit trail could not be exported.",
      invalidCopyRequest: "Invalid copy request.",
      unableToCopy: "Unable to copy this envelope.",
      unableToDeleteDraft: "Unable to delete this draft envelope.",
      invalidDeadline: "Choose a deadline between 1 and 365 days from now.",
      unableToChangeDeadline: "Unable to change the deadline.",
      unableToLoadDraftDocument: "Unable to load this draft document.",
      unableToVoid: "Unable to void this envelope.",
      invalidDownloadRequest: "Invalid download request.",
      unableToStartDownload: "Unable to start this download.",
      invalidFieldUpdate: "Invalid field update request.",
      unableToUpdateFields: "Unable to update this draft field list.",
      invalidSignerUpdate: "Invalid signer update request.",
      unableToUpdateSigners: "Unable to update this draft signer list.",
      invalidSignerCorrection: "Invalid signer correction.",
      unableToCorrectSigner: "Unable to correct this signer.",
      unableToLoadThumbnail: "Unable to load this thumbnail.",
      unableToSaveThumbnail: "Unable to save this thumbnail.",
      unableToSendReminder: "Unable to send a reminder.",
      invalidReminders:
        "Choose reminders between 1 and 30 days apart, or turn them off.",
      unableToChangeReminders: "Unable to change the reminders.",
      confirmOrdinaryAgreement:
        "Confirm that this envelope is an ordinary business agreement before sending.",
      invalidSendOptions:
        "Choose a deadline between 1 and 365 days from now, reminders between 1 and 30 days apart, and a signature type this install offers.",
      unableToSend: "Unable to send this envelope.",
      invalidEnvelopeRequest: "Invalid envelope request.",
      pdfRequired: "A PDF file is required.",
      unableToCreateDraft: "Unable to create the draft envelope.",
    },
  },

  template: {
    limitReached: (max: number) =>
      `You have ${String(max)} templates, which is the most an account can keep. Delete one to save another.`,
    unusable:
      "This template can no longer be used. Delete it, then save the document as a template again.",
    addSigner: "Add at least one signer before saving this as a template.",
    signersChanged:
      "The signers of this envelope have changed. Reload the page and try again.",
    documentGone:
      "This envelope's document is no longer available, so it cannot be saved as a template.",
    notFound: "Template not found.",
    namePeople: "Name one person for each signer in this template.",
    documentNotDeleted:
      "The template's document could not be deleted, so the template was kept. Try again in a moment.",

    api: {
      invalidRequest: "Invalid template request.",
      unableToSave: "Unable to save this as a template.",
      unableToDelete: "Unable to delete this template.",
      unableToUse: "Unable to start an envelope from this template.",
    },
  },

  upload: {
    /** Why an uploaded PDF was refused, by failure code. */
    pdf: {
      encrypted_pdf:
        "This PDF is password-protected or encrypted. Please upload an unlocked PDF.",
      invalid_type: "Only PDF files are supported. Please upload a valid PDF.",
      too_large: "This file exceeds the 20 MB limit.",
      unreadable_pdf: "We couldn't read this PDF. Please upload a valid file.",
      unsupported_variant:
        "This PDF uses an unsupported format. Please export it as a standard PDF.",
      upload_failed: "Upload failed. Please try again.",
    },
    invalidRequest: "Invalid upload request.",
    multipartUnsupported: "Multipart uploads are not supported.",
    invalidDestination: "Invalid upload destination.",
    invalidReference: "Invalid upload reference.",
    fileNotFound: "The uploaded file was not found. Please upload it again.",
    directUploadsUnavailable:
      "Direct uploads are not available on this install.",
    unableToStart: "Unable to start the upload.",

    thumbnail: {
      empty: "The thumbnail is empty.",
      tooLarge: "The thumbnail is too large.",
      notJpeg: "The thumbnail must be a JPEG image.",
      unusableSize: "The thumbnail is not a usable size.",
    },
  },

  account: {
    unauthorized: "Unauthorized.",
    accountNotFound: "Account not found.",
    invalidProfileInput: "Invalid profile input.",
    enterValidEmail: "Enter a valid email address",
    enterFullName: "Enter your full name",
    useVerifiedEmailChange:
      "Use the verified email change flow to update your sender email.",
    useSecureEmailChange: "Use the secure email change flow.",
    unableToUpdateProfile: "Unable to update your profile.",
    typeConfirmationPhrase: "Type the confirmation phrase to continue.",
    typePhraseToConfirm: (phrase: string) => `Type "${phrase}" to confirm.`,
    unableToSubmitClosure: "Unable to submit the closure request.",
  },

  admin: {
    onlyAdministrator: "Only an administrator can do this.",
    accountNoLongerExists: "That account no longer exists.",
    changeNotSaved: "That change could not be saved.",
    part11: {
      sayWhether: "Say whether Part 11 mode should be on.",
      selfHostedOnly: "Part 11 mode is for self-hosted installs.",
      chooseAction: "Choose verify, revoke or unlock.",
      describeIdentityCheck:
        "Say how you checked this person's identity, for example the document you saw.",
      emailNotConfirmed:
        "This person has not confirmed their email address yet.",
      turnOffRetentionFirst:
        "Turn off the retention period under Organization first. Part 11 records are kept for as long as the rules that apply to them require.",
    },
    people: {
      listNotLoaded: "The list of people could not be loaded.",
      chooseRole: "Choose administrator or member.",
      emailNotConfirmedForAdmin:
        "This person has not confirmed their email address yet. They can be made an administrator once they have.",
      closingCannotBeAdmin:
        "This account is being closed, so it cannot become an administrator.",
      needOneAdministrator:
        "There has to be at least one administrator. Make someone else an administrator first.",
    },
    security: {
      chooseSettings:
        "Say whether two-step sign-in should be required, or choose both session limits.",
      selfHostedOnly: "This setting is for self-hosted installs.",
      setUpOwnTwoFactorFirst:
        "Set up two-step sign-in for your own account first, under Settings, Two-step sign-in.",
      turnOffOwnTwoFactor:
        "Turn off your own two-step sign-in under Settings, Two-step sign-in.",
      noTwoFactor: "This person does not use two-step sign-in.",
    },
    logo: {
      notOwnLogo: "This site does not use its own logo.",
      chooseImage: "Choose an image to upload.",
      tooLarge: "The logo must be 512 KB or smaller.",
      wrongType: "The logo must be a PNG, JPEG or WebP image.",
      notSaved: "The logo could not be saved.",
      notRemoved: "The logo could not be removed.",
    },
    signerData: {
      enterEmail: "Enter the signer's email address.",
      confirmEmail: "Type the signer's email address again to confirm.",
      notCompleted: "That request could not be completed.",
    },
    settingsNotSaved: "The settings could not be saved.",
    auditNotRead: "The audit trail could not be read.",
    emailNotChecked: "Email setup could not be checked. Please try again.",
    unknownAction: "Unknown action.",
    testEmailNotSent: "The test email could not be sent.",
    updatesNotChecked: "Updates could not be checked. Please try again.",
  },

  orgSettings: {
    checkFields: "Check the highlighted fields.",
    fields: {
      allowedEmailDomains: "Enter one or more domains, such as yourcompany.com",
      brandColor: "Enter a color as six letters and digits, such as #1a73e8",
      locale: "Choose one of the languages in the list",
      organizationName: "Enter the name of your organization",
      privacyUrl: "Enter a full web address starting with https://",
      retentionDays: "Enter a number of days, 30 or more, or leave this empty",
      senderAddress: "Enter a valid email address, or leave this empty",
      signupMode: "Choose who can create an account",
      supportAddress: "Enter an email address people can write to for help",
      termsUrl: "Enter a full web address starting with https://",
    },
    notADomain: (domains: string) => `Not a domain: ${domains}`,
    part11KeepsRecords:
      "Part 11 mode is on, so finished envelopes are kept until you delete them. Leave this empty.",
  },

  setup: {
    checkFields: "Check the highlighted fields.",
    fields: {
      email: "Enter a valid email address",
      fullName: "Enter your full name",
      organizationName: "Enter the name of your organization",
      password: "Password must be at least 15 characters",
      passwordTooLong: "Password must be at most 128 characters",
      senderAddress: "Enter a valid email address, or leave this empty",
      setupToken: "Enter the setup token",
      supportAddress: "Enter an email address people can write to for help",
    },
    sendAsJson: "Send this request as JSON.",
    notCompleted: "Setup could not be completed. Please try again.",
    accountNotCreated: "The account could not be created.",
    chooseDifferentPassword: "Choose a different password.",
    passwordBreached: "This password has appeared in a breach. Choose another.",
    alreadyHasAccounts:
      "This site already has accounts. Set the SETUP_TOKEN environment variable and redeploy to choose its administrator.",
    wrongToken: "The setup token is not correct.",
    wrongTokenField: "This is not the setup token for this site",
    alreadyRunning: "Setup is already running. Try again in a moment.",
    alreadySetUp: "This site has already been set up.",
    databaseNotReady:
      "The database is not ready yet. Deploy again so the tables can be created.",
    administratorNotCreated: "The administrator account was not created.",
    signInFirst:
      "Sign in with the account that should become the administrator, then open this page again.",
    verifyEmailFirst:
      "Verify your email address before becoming the administrator.",
    accountNotFound: "Your account was not found.",
  },

  auth: {
    setUpTwoFactorFirst: "Set up two-step sign-in before continuing.",
    verifyEmailFirst: "Verify your email address before continuing.",
    sessionEnded: "Your session has ended. Sign in again.",
    useOrganizationSignIn: "Sign in through your organization's sign-in page.",
    secondStepEveryTime:
      "This install asks for the second step at every sign-in.",
    signInLocked:
      "Too many wrong passwords for this email address. Try again in 15 minutes, or reset your password.",
    twoFactorRequired:
      "Your organization requires two-step sign-in, so it cannot be turned off.",
    passwordSignInOff: (provider: string) =>
      `Password sign-in is turned off here. Continue with ${provider} instead.`,
    signup: {
      open: "Anyone can create an account.",
      domains: (domains: readonly string[]) =>
        `Accounts can be created with an email address at ${listWithOr(domains, "or")}.`,
      closed: "New accounts are not being accepted.",
      notSetUp: "This site has not been set up yet.",
    },
  },

  download: {
    signedPdfCompletedOnly:
      "Signed PDF downloads are available only for completed envelopes.",
    signedPdfUnavailable: "Signed PDF is unavailable.",
    fileNoLongerAvailable: "This file is no longer available.",
    certificateAfterFinish:
      "Certificate downloads are available only after completion, decline, or void.",
    envelopeNotFound: "Envelope not found.",
    linkInvalidOrExpired: "This download link is invalid or has expired.",
    linkExpired: "This download link has expired.",
    linkSentRecently: "A new link was sent recently. Check your email.",
    newLinksNotSent: "New links could not be sent right now.",
    unableToStart: "Unable to start this download.",
  },

  verify: {
    sendHash: "Send the file's SHA-256 value.",
    notChecked: "The file could not be checked right now.",
  },
};

export type ServerMessages = typeof en;

const fr: ServerMessages = {
  api: {
    tooManyRequests: "Trop de requêtes. Réessayez dans quelques instants.",
  },

  signing: {
    alreadySigned: "Vous avez déjà signé.",
    envelopeDeclined: "Cette demande de signature a été refusée.",
    envelopeVoided: "Cette demande de signature a été annulée.",
    linkExpired: "Ce lien a expiré.",
    linkNoLongerActive: "Ce lien de signature n’est plus actif.",
    confirmIdentity: "Confirmez votre identité pour ouvrir ce document.",
    drawnSignatureNotPng:
      "Les signatures dessinées doivent être envoyées au format PNG.",
    drawnSignatureTooLarge:
      "L’image de la signature dessinée est trop volumineuse.",
    drawnSignatureEmpty: "L’image de la signature dessinée est vide.",
    oneRadioPerGroup:
      "Choisissez une seule option dans chaque groupe de boutons radio.",
    completeRequiredFields:
      "Remplissez tous les champs obligatoires avant de terminer.",
    completedSignerWithoutId:
      "Chaque signataire ayant terminé doit avoir un identifiant.",
    noCodeNeeded: "Aucun code n’est nécessaire pour ce lien.",
    checkNotNeeded: "Cette vérification n’est pas nécessaire.",
    codeExpired: "Ce code a expiré. Demandez-en un nouveau.",
    codeWrong: "Ce code n’est pas correct.",
    disclosureChanged:
      "Le texte d’information a changé. Rechargez la page pour lire la version en vigueur.",
    part11NoAccount:
      "Ce document a été envoyé pour des signatures Part 11, mais aucun compte ni aucune signification de signature ne vous est associé. Demandez à l’expéditeur de le renvoyer.",
    enterCredentials:
      "Saisissez votre adresse e-mail et votre mot de passe pour signer.",
    identityNotConfirmed: `Votre compte ne peut pas signer ce document pour le moment${NBSP}: un administrateur doit confirmer votre identité et votre adresse e-mail doit être confirmée. Adressez-vous à l’expéditeur ou à un administrateur.`,
    accountLocked: (attempts: number) =>
      `Ce compte est bloqué pour la signature après ${String(attempts)} mots de passe erronés. Demandez à un administrateur de le débloquer.`,
    wrongCredentials: (attemptsLeft: number) =>
      `Adresse e-mail ou mot de passe incorrect. Il vous reste ${String(attemptsLeft)} ${attemptsLeft > 1 ? "essais" : "essai"} avant le blocage du compte pour la signature.`,
    documentChanged:
      "Le document a changé pendant votre signature. Ouvrez à nouveau votre lien de signature.",
    sessionEnded: "Cette session de signature est terminée.",
    noSignableFields: "Aucun champ à remplir n’est attribué à ce signataire.",
    fieldSubmittedTwice: "Chaque champ ne peut être envoyé qu’une seule fois.",
    notProviderSigned:
      "Ce document ne se signe pas via un prestataire de signature.",
    ownCertificate:
      "Ce document se signe avec un certificat à votre nom. Poursuivez depuis la page de signature.",
    consentRequired:
      "Acceptez l’utilisation de documents et de signatures électroniques avant de signer.",
    routingOutOfSync:
      "L’ordre de signature est désynchronisé pour le signataire suivant.",
    unableToSaveFieldValues:
      "Impossible d’enregistrer la valeur d’un ou plusieurs champs.",
    unableToActivateNextSigner:
      "Impossible de passer au signataire suivant de cette demande de signature.",
    sourceDocumentMissing:
      "Le document d’origine de cette demande de signature est introuvable.",
    unableToFinalize:
      "Impossible de finaliser cette demande de signature terminée.",
    changedWhileDeclining:
      "Cette demande de signature a changé pendant votre refus. Ouvrez à nouveau votre lien de signature.",
    providerNeedsAppUrl:
      "La signature via un prestataire nécessite l’adresse publique de l’installation (APP_URL).",
    providerNotSetUp:
      "Le prestataire de signature utilisé pour ce document n’est plus configuré. Demandez à l’expéditeur de le renvoyer.",
    providerCouldNotStart: (provider: string) =>
      `${provider} n’a pas pu démarrer la signature. Réessayez dans un instant.`,
    storedSignedDocumentChanged:
      "Le document signé enregistré pour cette demande de signature a changé. Demandez de l’aide à l’expéditeur.",
    storedDocumentMismatch:
      "Le document enregistré ne correspond plus à celui qui a été envoyé pour signature.",

    invalidSubmission: "Les données de signature envoyées ne sont pas valides.",
    unableToFinish: "Impossible de terminer la signature.",
    invalidDecline: "La demande de refus n’est pas valide.",
    unableToDecline: "Impossible de refuser ce document.",
    unableToLoadLink: "Impossible de charger ce lien de signature.",
    unableToLoadDocument: "Impossible de charger ce document.",
    unableToStart: "Impossible de commencer la signature.",
    invalidRequest: "La requête n’est pas valide.",
    consentNotSaved: "Votre accord n’a pas pu être enregistré pour le moment.",
    enterCode: "Saisissez le code.",
    tooManyTries:
      "Trop de tentatives. Patientez quelques minutes, puis réessayez.",
    codeNotChecked: "Le code n’a pas pu être vérifié pour le moment.",
    tooManyCodes:
      "Plusieurs codes ont déjà été envoyés. Consultez vos e-mails.",
    codeNotSent: "Le code n’a pas pu être envoyé pour le moment.",
  },

  validation: {
    duplicateSignerEmail:
      "Chaque signataire doit avoir une adresse e-mail différente.",
    duplicateCopyRecipientEmail:
      "Cette adresse est déjà celle d’un signataire ou d’un destinataire en copie.",
    uniqueRoutingOrder:
      "Chaque signataire doit avoir un ordre de signature différent",
    missingCorrectedSignerFields:
      "Indiquez un nom, une adresse e-mail, ou les deux.",
    duplicateRoleName: "Donnez un nom différent à chaque signataire du modèle.",
    uniqueTemplateSigner: "Chaque signataire du modèle doit être unique.",
    onlyDropdownsHaveChoices:
      "Seules les listes déroulantes proposent des choix",
    distinctChoices: "Chaque choix d’une liste déroulante doit être différent",
    radioNeedsGroup: "Un bouton radio doit appartenir à un groupe",
    onlyRadiosInGroups: "Seuls les boutons radio appartiennent à un groupe",
    fieldTooWide: "La largeur du champ dépasse les limites de la page",
    fieldTooTall: "La hauteur du champ dépasse les limites de la page",
    alwaysRequired: {
      signature: "Les champs de signature sont toujours obligatoires",
      initials: "Les champs de paraphe sont toujours obligatoires",
      date: "Les champs de date sont toujours obligatoires",
    },
    radioGroupMismatch:
      "Les boutons d’un groupe radio doivent avoir le même signataire et être tous obligatoires ou tous facultatifs",
    radioGroupTooLarge: `Un groupe radio peut compter au plus ${String(MAX_RADIO_GROUP_BUTTONS)} boutons`,
    drawnSignatureTooLarge:
      "L’image de la signature dessinée est trop volumineuse.",
    numberEntry:
      "Saisissez un nombre, par exemple 1250 ou 12.5 (avec un point décimal).",
    dropdownEntry:
      "Choisissez l’une des options proposées dans chaque liste déroulante.",
  },

  envelope: {
    emailNotConnected:
      "L’envoi des e-mails n’est pas encore configuré : les signataires ne peuvent donc pas être prévenus. Un administrateur peut terminer la configuration dans Paramètres, Organisation.",
    notFound: "Demande de signature introuvable.",
    draftCannotBeCopied: "Un brouillon ne peut pas être copié.",
    documentGoneCannotCopy:
      "Le document de cette demande de signature n’est plus disponible : elle ne peut pas être copiée.",
    cannotBeCopied: "Cette demande de signature ne peut pas être copiée.",
    sourcePdfUnavailable: "Le PDF d’origine n’est pas disponible.",
    noThumbnailYet: "Ce document n’a pas encore de miniature.",
    onlyDraftsUpdated: "Seuls les brouillons peuvent être modifiés.",
    onlyDraftsSent: "Seuls les brouillons peuvent être envoyés.",
    onlyDraftsDeleted: "Seuls les brouillons peuvent être supprimés.",
    draftNoLongerDeletable: "Ce brouillon ne peut plus être supprimé.",
    addSignersAndFields:
      "Ajoutez des signataires et placez des champs avant d’envoyer cette demande de signature.",
    addSigners:
      "Ajoutez des signataires avant d’envoyer cette demande de signature.",
    fieldNeedsExistingSigner:
      "Chaque champ doit être attribué à un signataire de cette demande de signature.",
    fieldNeedsExistingPage:
      "Chaque champ doit être placé sur une page existante de ce document.",
    fieldUnique: "Chaque champ doit être unique.",
    signerUnique: "Chaque signataire doit être unique.",
    copyRecipientUnique: "Chaque destinataire en copie doit être unique.",
    signerMissingSignature: (name) =>
      `Chaque signataire doit avoir au moins un champ Signature avant l’envoi. Il en manque un pour ${name}.`,
    dropdownNeedsChoices: (signerName) =>
      `Une liste déroulante pour ${signerName} doit proposer au moins deux choix. Sélectionnez-la et ajoutez-les.`,
    radioButtonAlone: (signerName) =>
      `Un bouton radio pour ${signerName} est seul. Ajoutez un autre bouton à son groupe, ou supprimez-le.`,
    aSigner: "un signataire",
    noSigningProvider:
      "Cette installation n’a pas de prestataire de signature pour les signatures avancées ou qualifiées.",
    part11SimpleSignaturesOnly:
      "En mode Part 11, les signataires signent avec leur compte. Envoyez avec des signatures simples.",
    part11SignerCannotSign: "Un signataire ne peut pas signer en mode Part 11.",
    part11Signer: {
      needsAccount: (p) =>
        `${p.name} (${p.email}) doit avoir un compte sur ce site pour pouvoir signer. Le mode Part 11 n’autorise la signature qu’avec son propre compte.`,
      emailNotConfirmed: (name) =>
        `${name} n’a pas encore confirmé son adresse e-mail.`,
      identityNotConfirmed: (name) =>
        `Un administrateur doit confirmer l’identité de ${name} sous Paramètres, Personnes avant que cette personne puisse signer.`,
      lockedForSigning: (name) =>
        `Le compte de ${name} est bloqué pour la signature après trop de mots de passe erronés. Un administrateur peut le débloquer sous Paramètres, Personnes.`,
      chooseMeaning: (name) =>
        `Choisissez la signification de la signature de ${name} (approbation, relecture, responsabilité ou paternité).`,
    },
    sourceDocumentMissing:
      "Le document d’origine de cette demande de signature est introuvable.",
    alreadySent: "Cette demande de signature a déjà été envoyée.",
    changedWhileSending:
      "Cette demande de signature a été modifiée pendant son envoi. Vérifiez-la et envoyez-la de nouveau.",
    unableToActivateFirstSigner:
      "Impossible d’activer le premier signataire de cette demande de signature.",
    noDeadlineToChange:
      "Seule une demande de signature en cours a une date limite modifiable.",
    deadlinePassed: (date) =>
      `Cette demande a expiré le ${date}. Définissez d’abord une nouvelle date limite.`,
    onlySentSignerCorrection:
      "Un signataire ne peut être corrigé que sur une demande de signature en cours.",
    part11SignerBound:
      "Cette demande de signature a été envoyée en mode Part 11. L’identité du signataire est liée à son compte et ne peut pas être corrigée.",
    signedCannotBeCorrected:
      "Cette personne a déjà signé et ne peut plus être corrigée.",
    declinedCannotBeCorrected:
      "Cette personne a déjà refusé et ne peut plus être corrigée.",
    finishedCannotBeCorrected:
      "Cette personne a déjà signé ou refusé et ne peut plus être corrigée.",
    onlySentVoided:
      "Seules les demandes de signature envoyées peuvent être annulées.",
    voidReasonRequired:
      "Indiquez le motif de l’annulation. Les enregistrements Part 11 le conservent dans la piste d’audit.",
    noLongerVoidable: "Cette demande de signature ne peut plus être annulée.",

    reminder: {
      unavailable: "Cette demande de signature n’est pas disponible.",
      onlySent:
        "Seules les demandes de signature envoyées peuvent faire l’objet d’une relance.",
      notWaiting: "Cette demande de signature n’attend plus aucun signataire.",
      expired: (date) =>
        `Cette demande a expiré le ${date}. Définissez une nouvelle date limite avant d’envoyer une relance.`,
      deadlineJustChanged:
        "La date limite de cette demande de signature vient de changer. Réessayez.",
      automaticOff:
        "Les relances automatiques sont désactivées pour cette demande de signature.",
      notDueYet:
        "La prochaine relance de cette demande de signature n’est pas encore prévue.",
      availableAfter: (date) =>
        `Vous pourrez envoyer une nouvelle relance après le ${date}.`,
    },

    api: {
      auditExportFailed: "La piste d’audit n’a pas pu être exportée.",
      invalidCopyRequest: "Demande de copie non valide.",
      unableToCopy: "Impossible de copier cette demande de signature.",
      unableToDeleteDraft: "Impossible de supprimer ce brouillon.",
      invalidDeadline: "Choisissez une date limite entre 1 et 365 jours.",
      unableToChangeDeadline: "Impossible de modifier la date limite.",
      unableToLoadDraftDocument: "Impossible de charger ce brouillon.",
      unableToVoid: "Impossible d’annuler cette demande de signature.",
      invalidDownloadRequest: "Demande de téléchargement non valide.",
      unableToStartDownload: "Impossible de lancer ce téléchargement.",
      invalidFieldUpdate: "Modification des champs non valide.",
      unableToUpdateFields:
        "Impossible de mettre à jour les champs de ce brouillon.",
      invalidSignerUpdate: "Modification des signataires non valide.",
      unableToUpdateSigners:
        "Impossible de mettre à jour les signataires de ce brouillon.",
      invalidSignerCorrection: "Correction du signataire non valide.",
      unableToCorrectSigner: "Impossible de corriger ce signataire.",
      unableToLoadThumbnail: "Impossible de charger cette miniature.",
      unableToSaveThumbnail: "Impossible d’enregistrer cette miniature.",
      unableToSendReminder: "Impossible d’envoyer une relance.",
      invalidReminders:
        "Choisissez un intervalle de relance entre 1 et 30 jours, ou désactivez les relances.",
      unableToChangeReminders: "Impossible de modifier les relances.",
      confirmOrdinaryAgreement:
        "Confirmez que cette demande de signature porte sur un accord commercial ordinaire avant de l’envoyer.",
      invalidSendOptions:
        "Choisissez une date limite entre 1 et 365 jours, un intervalle de relance entre 1 et 30 jours et un type de signature proposé par cette installation.",
      unableToSend: "Impossible d’envoyer cette demande de signature.",
      invalidEnvelopeRequest: "Demande de signature non valide.",
      pdfRequired: "Un fichier PDF est requis.",
      unableToCreateDraft: "Impossible de créer le brouillon.",
    },
  },

  template: {
    limitReached: (max) =>
      `Vous avez ${String(max)} modèles, le maximum pour un compte. Supprimez-en un pour en enregistrer un autre.`,
    unusable:
      "Ce modèle n’est plus utilisable. Supprimez-le, puis enregistrez de nouveau le document comme modèle.",
    addSigner:
      "Ajoutez au moins un signataire avant d’enregistrer ce document comme modèle.",
    signersChanged:
      "Les signataires de cette demande de signature ont changé. Rechargez la page et réessayez.",
    documentGone:
      "Le document de cette demande de signature n’est plus disponible : elle ne peut pas être enregistrée comme modèle.",
    notFound: "Modèle introuvable.",
    namePeople: "Indiquez une personne pour chaque signataire de ce modèle.",
    documentNotDeleted:
      "Le document du modèle n’a pas pu être supprimé : le modèle a été conservé. Réessayez dans un instant.",

    api: {
      invalidRequest: "Demande de modèle non valide.",
      unableToSave: "Impossible d’enregistrer ce document comme modèle.",
      unableToDelete: "Impossible de supprimer ce modèle.",
      unableToUse:
        "Impossible de créer une demande de signature à partir de ce modèle.",
    },
  },

  upload: {
    pdf: {
      encrypted_pdf:
        "Ce PDF est protégé par un mot de passe ou chiffré. Importez un PDF déverrouillé.",
      invalid_type:
        "Seuls les fichiers PDF sont acceptés. Importez un PDF valide.",
      too_large: "Ce fichier dépasse la limite de 20 Mo.",
      unreadable_pdf:
        "Nous n’avons pas pu lire ce PDF. Importez un fichier valide.",
      unsupported_variant:
        "Ce PDF utilise un format non pris en charge. Exportez-le en PDF standard.",
      upload_failed: "L’import a échoué. Réessayez.",
    },
    invalidRequest: "Demande d’import non valide.",
    multipartUnsupported:
      "Les imports en plusieurs parties ne sont pas pris en charge.",
    invalidDestination: "Destination d’import non valide.",
    invalidReference: "Référence d’import non valide.",
    fileNotFound: "Le fichier importé est introuvable. Importez-le de nouveau.",
    directUploadsUnavailable:
      "L’import direct n’est pas disponible sur cette installation.",
    unableToStart: "Impossible de lancer l’import.",

    thumbnail: {
      empty: "La miniature est vide.",
      tooLarge: "La miniature est trop volumineuse.",
      notJpeg: "La miniature doit être une image JPEG.",
      unusableSize: "La miniature n’a pas une taille utilisable.",
    },
  },

  account: {
    unauthorized: "Non autorisé.",
    accountNotFound: "Compte introuvable.",
    invalidProfileInput: "Les informations du profil ne sont pas valides.",
    enterValidEmail: "Saisissez une adresse e-mail valide",
    enterFullName: "Saisissez vos prénom et nom",
    useVerifiedEmailChange:
      "Pour changer votre adresse e-mail d’expéditeur, passez par le changement d’adresse avec vérification.",
    useSecureEmailChange: "Passez par le changement d’adresse sécurisé.",
    unableToUpdateProfile: "Impossible de mettre à jour votre profil.",
    typeConfirmationPhrase:
      "Saisissez la phrase de confirmation pour continuer.",
    typePhraseToConfirm: (phrase: string) =>
      `Saisissez « ${phrase} » pour confirmer.`,
    unableToSubmitClosure: "Impossible d’envoyer la demande de fermeture.",
  },

  admin: {
    onlyAdministrator: "Seul un administrateur peut faire cela.",
    accountNoLongerExists: "Ce compte n’existe plus.",
    changeNotSaved: "Cette modification n’a pas pu être enregistrée.",
    part11: {
      sayWhether: "Indiquez si le mode Part 11 doit être activé.",
      selfHostedOnly:
        "Le mode Part 11 est réservé aux installations auto-hébergées.",
      chooseAction: "Choisissez vérifier, révoquer ou débloquer.",
      describeIdentityCheck:
        "Indiquez comment vous avez vérifié l’identité de cette personne, par exemple le document que vous avez vu.",
      emailNotConfirmed:
        "Cette personne n’a pas encore confirmé son adresse e-mail.",
      turnOffRetentionFirst:
        "Désactivez d’abord la durée de conservation sous Organisation. Les enregistrements Part 11 sont conservés aussi longtemps que l’exigent les règles qui s’y appliquent.",
    },
    people: {
      listNotLoaded: "La liste des personnes n’a pas pu être chargée.",
      chooseRole: "Choisissez administrateur ou membre.",
      emailNotConfirmedForAdmin:
        "Cette personne n’a pas encore confirmé son adresse e-mail. Elle pourra devenir administrateur une fois que ce sera fait.",
      closingCannotBeAdmin:
        "Ce compte est en cours de fermeture : il ne peut pas devenir administrateur.",
      needOneAdministrator:
        "Il faut au moins un administrateur. Nommez d’abord quelqu’un d’autre administrateur.",
    },
    security: {
      chooseSettings:
        "Indiquez si la connexion en deux étapes doit être obligatoire, ou choisissez les deux limites de session.",
      selfHostedOnly:
        "Ce paramètre est réservé aux installations auto-hébergées.",
      setUpOwnTwoFactorFirst:
        "Configurez d’abord la connexion en deux étapes pour votre propre compte, sous Paramètres, Connexion en deux étapes.",
      turnOffOwnTwoFactor:
        "Désactivez votre propre connexion en deux étapes sous Paramètres, Connexion en deux étapes.",
      noTwoFactor: "Cette personne n’utilise pas la connexion en deux étapes.",
    },
    logo: {
      notOwnLogo: "Ce site n’utilise pas son propre logo.",
      chooseImage: "Choisissez une image à envoyer.",
      tooLarge: "Le logo ne doit pas dépasser 512 Ko.",
      wrongType: "Le logo doit être une image PNG, JPEG ou WebP.",
      notSaved: "Le logo n’a pas pu être enregistré.",
      notRemoved: "Le logo n’a pas pu être supprimé.",
    },
    signerData: {
      enterEmail: "Saisissez l’adresse e-mail du signataire.",
      confirmEmail:
        "Saisissez de nouveau l’adresse e-mail du signataire pour confirmer.",
      notCompleted: "Cette demande n’a pas pu aboutir.",
    },
    settingsNotSaved: "Les paramètres n’ont pas pu être enregistrés.",
    auditNotRead: "Le journal d’audit n’a pas pu être lu.",
    emailNotChecked:
      "La configuration des e-mails n’a pas pu être vérifiée. Réessayez.",
    unknownAction: "Action inconnue.",
    testEmailNotSent: "L’e-mail de test n’a pas pu être envoyé.",
    updatesNotChecked:
      "Les mises à jour n’ont pas pu être vérifiées. Réessayez.",
  },

  orgSettings: {
    checkFields: "Vérifiez les champs signalés.",
    fields: {
      allowedEmailDomains:
        "Saisissez un ou plusieurs domaines, par exemple votreentreprise.fr",
      brandColor:
        "Saisissez une couleur de six lettres et chiffres, par exemple #1a73e8",
      locale: "Choisissez l’une des langues de la liste",
      organizationName: "Saisissez le nom de votre organisation",
      privacyUrl: "Saisissez une adresse web complète commençant par https://",
      retentionDays:
        "Saisissez un nombre de jours, 30 ou plus, ou laissez ce champ vide",
      senderAddress:
        "Saisissez une adresse e-mail valide, ou laissez ce champ vide",
      signupMode: "Choisissez qui peut créer un compte",
      supportAddress:
        "Saisissez une adresse e-mail à laquelle on peut vous écrire pour obtenir de l’aide",
      termsUrl: "Saisissez une adresse web complète commençant par https://",
    },
    notADomain: (domains: string) => `Domaine non valide : ${domains}`,
    part11KeepsRecords:
      "Le mode Part 11 est activé : les demandes de signature terminées sont conservées jusqu’à ce que vous les supprimiez. Laissez ce champ vide.",
  },

  setup: {
    checkFields: "Vérifiez les champs signalés.",
    fields: {
      email: "Saisissez une adresse e-mail valide",
      fullName: "Saisissez vos prénom et nom",
      organizationName: "Saisissez le nom de votre organisation",
      password: "Le mot de passe doit comporter au moins 15 caractères",
      passwordTooLong: "Le mot de passe doit comporter au plus 128 caractères",
      senderAddress:
        "Saisissez une adresse e-mail valide, ou laissez ce champ vide",
      setupToken: "Saisissez le jeton d’installation",
      supportAddress:
        "Saisissez une adresse e-mail à laquelle on peut vous écrire pour obtenir de l’aide",
    },
    sendAsJson: "Envoyez cette requête au format JSON.",
    notCompleted: "L’installation n’a pas pu aboutir. Réessayez.",
    accountNotCreated: "Le compte n’a pas pu être créé.",
    chooseDifferentPassword: "Choisissez un autre mot de passe.",
    passwordBreached:
      "Ce mot de passe figure dans une fuite de données. Choisissez-en un autre.",
    alreadyHasAccounts:
      "Ce site a déjà des comptes. Définissez la variable d’environnement SETUP_TOKEN et redéployez pour choisir son administrateur.",
    wrongToken: "Le jeton d’installation est incorrect.",
    wrongTokenField: "Ce n’est pas le jeton d’installation de ce site",
    alreadyRunning:
      "L’installation est déjà en cours. Réessayez dans un instant.",
    alreadySetUp: "Ce site est déjà installé.",
    databaseNotReady:
      "La base de données n’est pas encore prête. Redéployez pour que les tables soient créées.",
    administratorNotCreated: "Le compte administrateur n’a pas été créé.",
    signInFirst:
      "Connectez-vous avec le compte qui doit devenir administrateur, puis rouvrez cette page.",
    verifyEmailFirst:
      "Vérifiez votre adresse e-mail avant de devenir administrateur.",
    accountNotFound: "Votre compte est introuvable.",
  },

  auth: {
    setUpTwoFactorFirst:
      "Configurez la connexion en deux étapes avant de continuer.",
    verifyEmailFirst: "Vérifiez votre adresse e-mail avant de continuer.",
    sessionEnded: "Votre session a pris fin. Reconnectez-vous.",
    useOrganizationSignIn:
      "Connectez-vous par la page de connexion de votre organisation.",
    secondStepEveryTime:
      "Cette installation demande la deuxième étape à chaque connexion.",
    signInLocked:
      "Trop de mots de passe erronés pour cette adresse e-mail. Réessayez dans 15 minutes, ou réinitialisez votre mot de passe.",
    twoFactorRequired:
      "Votre organisation impose la connexion en deux étapes : elle ne peut pas être désactivée.",
    passwordSignInOff: (provider: string) =>
      `La connexion par mot de passe est désactivée ici. Continuez avec ${provider}.`,
    signup: {
      open: "Tout le monde peut créer un compte.",
      domains: (domains: readonly string[]) =>
        `Les comptes peuvent être créés avec une adresse e-mail en ${listWithOr(domains, "ou")}.`,
      closed: "La création de comptes est fermée.",
      notSetUp: "Ce site n’est pas encore installé.",
    },
  },

  download: {
    signedPdfCompletedOnly:
      "Le PDF signé n’est téléchargeable que pour les demandes de signature terminées.",
    signedPdfUnavailable: "Le PDF signé n’est pas disponible.",
    fileNoLongerAvailable: "Ce fichier n’est plus disponible.",
    certificateAfterFinish:
      "Le certificat n’est téléchargeable qu’une fois la demande de signature terminée, refusée ou annulée.",
    envelopeNotFound: "Demande de signature introuvable.",
    linkInvalidOrExpired:
      "Ce lien de téléchargement n’est pas valide ou a expiré.",
    linkExpired: "Ce lien de téléchargement a expiré.",
    linkSentRecently:
      "Un nouveau lien vous a été envoyé récemment. Consultez vos e-mails.",
    newLinksNotSent:
      "Les nouveaux liens n’ont pas pu être envoyés pour le moment.",
    unableToStart: "Impossible de lancer ce téléchargement.",
  },

  verify: {
    sendHash: "Envoyez l’empreinte SHA-256 du fichier.",
    notChecked: "Le fichier n’a pas pu être vérifié pour le moment.",
  },
};

export function serverMessages(locale: Locale): ServerMessages {
  return locale === "fr" ? fr : en;
}

/**
 * Words for the browser: plain text (kept as it is, unless it is one of the
 * schema messages) or a pick from the dictionary in the reader's language.
 */
export type UserMessage =
  string | ((messages: ServerMessages, locale: Locale) => string);

/** The English text of a message, for `Error.message`, logs and records. */
export function inEnglish(message: UserMessage): string {
  return typeof message === "string" ? message : message(en, "en");
}

/** An error whose message is meant for the person who caused it. */
export type LocalizedError = Error & { readonly userMessage: UserMessage };

function isLocalizedError(error: Error): error is LocalizedError {
  return "userMessage" in error && error.userMessage !== undefined;
}

/**
 * A message, or the message of an error, in the given language. An error
 * without a `userMessage` gives its own message, translated only when it is
 * one of the schema messages.
 */
export function translateMessage(
  message: UserMessage | Error,
  locale: Locale,
): string {
  if (message instanceof Error) {
    return translateMessage(
      isLocalizedError(message) ? message.userMessage : message.message,
      locale,
    );
  }

  if (typeof message === "function") {
    return message(serverMessages(locale), locale);
  }

  return locale === "en"
    ? message
    : (validationLookup(locale).get(message) ?? message);
}

type ValidationTree = { [key: string]: string | ValidationTree };

const lookups = new Map<Locale, Map<string, string>>();

// English schema message to the same message in `locale`.
function validationLookup(locale: Locale): Map<string, string> {
  let lookup = lookups.get(locale);

  if (!lookup) {
    lookup = new Map();
    collect(
      lookup,
      en.validation as ValidationTree,
      serverMessages(locale).validation as ValidationTree,
    );
    lookups.set(locale, lookup);
  }

  return lookup;
}

function collect(
  into: Map<string, string>,
  english: ValidationTree,
  translated: ValidationTree,
) {
  for (const [key, value] of Object.entries(english)) {
    const other = translated[key];

    if (typeof value === "string" && typeof other === "string") {
      into.set(value, other);
    } else if (typeof value === "object" && typeof other === "object") {
      collect(into, value, other);
    }
  }
}
