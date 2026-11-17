// What the signing pages say to a signer, in each language an install can
// speak. English is written first; every other dictionary has its type, so
// the compiler lists any message it is missing.
//
// The consent disclosure is translated where it is built
// (electronic-records-disclosure.ts) and errors thrown by the server arrive
// already worded; neither is repeated here.

import type { FieldType } from "../types/domain.ts";
import type { Locale } from "./locales.ts";

type SignatureKind = "initials" | "signature";

export type VerificationMethod = "access_code" | "account" | "email_code";

export type SigningUnavailableState =
  "already-signed" | "declined" | "error" | "expired" | "voided";

export type ProviderSignatureProblem =
  "cancelled" | "expired" | "failed" | "name";

const en = {
  declinedConfirmation: {
    description:
      "Your decline has been recorded. No further action is needed, and this link no longer opens the document.",
    title: "You declined to sign",
  },
  /** Shown when the signing link cannot be opened. */
  unavailable: {
    error: {
      title: "Something went wrong. Please try again.",
      description:
        "We couldn't load this document right now. Reload the page or request a fresh signing link from the sender.",
    },
    expired: {
      title: "This link has expired",
      description: "Request a new signing link from the sender.",
    },
    "already-signed": {
      title: "You've already signed",
      description: "You already completed your signature for this document.",
    },
    voided: {
      title: "This envelope has been voided",
      description:
        "The sender cancelled this document. No further action is needed.",
    },
    declined: {
      title: "This envelope has been declined",
      description:
        "A signer declined this document. No further action is needed.",
    },
  } satisfies Record<
    SigningUnavailableState,
    { description: string; title: string }
  >,

  /** The page a signer lands on once they have signed. */
  done: {
    fallbackTitle: "this document",
    heading: "You're all done.",
    recordedPrefix: "Your signature has been recorded for",
    quotedTitle: (title: string) => `"${title}"`,
    recordedSuffix: ".",
    emailNotice:
      "You'll receive an email with the signed document once all parties have signed.",
    closeTab: "You can close this tab.",
  },

  /** Checks a signer passes before the document opens. */
  verification: {
    methods: {
      access_code: {
        helper:
          "The sender gave you this code separately, for example by phone.",
        label: "Access code",
      },
      account: {
        helper:
          "This document is signed with your own account here. Enter the password you sign in with.",
        label: "Password",
      },
      email_code: {
        helper:
          "We email a 6-digit code to the address this document was sent to.",
        label: "Code from your email",
      },
    } satisfies Record<VerificationMethod, { helper: string; label: string }>,
    codeSent: (maskedEmail: string) => `A code was sent to ${maskedEmail}.`,
    sendFailed: "The code could not be sent right now.",
    checkFailed: "The code could not be checked right now.",
    heading: "Confirm it's you",
    intro: (senderName: string, envelopeTitle: string) =>
      `${senderName} asked for a check before you open “${envelopeTitle}”.`,
    step: (step: number, total: number) =>
      ` Step ${String(step)} of ${String(total)}.`,
    emailHelper: (maskedEmail: string) =>
      `The address this document was sent to (${maskedEmail}).`,
    emailLabel: "Email address",
    continue: "Continue",
    sendNewCode: "Send a new code",
    emailMeCode: "Email me a code",
  },

  /** Labels drawn on a field on the page when the sender gave none. */
  canvasFieldLabels: {
    signature: "Sign",
    initials: "Initial",
    date: "Date",
    text: "Text",
    checkbox: "Checkbox",
    number: "Number",
    dropdown: "Choose",
    radio: "Option",
  } satisfies Record<FieldType, string>,
  /** What a field asks for, when the sender gave it no label. */
  fieldLabels: {
    signature: "Sign here",
    initials: "Initial here",
    date: "Date",
    text: "Enter text",
    checkbox: "Checkbox",
    number: "Enter a number",
    dropdown: "Choose one",
    radio: "Option",
  } satisfies Record<FieldType, string>,
  /** The kind of field, in the list of assigned fields. */
  summaryLabels: {
    signature: "Signature",
    initials: "Initials",
    date: "Date",
    text: "Text input",
    checkbox: "Checkbox",
    number: "Number",
    dropdown: "Dropdown",
    radio: "Choice",
  } satisfies Record<FieldType, string>,
  fieldFallback: "Field",

  /** Values in the list of assigned fields. */
  values: {
    tapToSign: "Tap to sign",
    enterText: "Enter text",
    notANumber: "Not a number",
    enterNumber: "Enter a number",
    chooseOne: "Choose one",
    checked: "Checked",
    unchecked: "Unchecked",
    optional: "Optional",
  },

  errors: {
    submit:
      "We couldn't finish signing right now. Reload the page or request a fresh signing link from the sender.",
    decline:
      "We couldn't record your decline right now. Reload the page or request a fresh signing link from the sender.",
    consent: "Your agreement could not be saved right now.",
  },

  providerProblem: {
    cancelled: (providerName: string) =>
      `You did not finish signing at ${providerName}. Nothing was signed, so you can try again.`,
    expired: () =>
      "Your earlier signing session ended before it finished. Nothing was signed, so you can try again.",
    name: (providerName: string) =>
      `The certificate you signed with at ${providerName} is not in the name this document was sent to. Nothing was signed. If the name is wrong, ask the sender to send the document again under the name on your certificate.`,
    failed: (providerName: string) =>
      `${providerName} could not complete your signature. Nothing was signed. Try again, or ask the sender for help.`,
  } satisfies Record<
    ProviderSignatureProblem,
    (providerName: string) => string
  >,

  header: {
    from: (senderName: string) => `From ${senderName}`,
    downloadPdf: "Download PDF",
    decline: "Decline",
  },

  toolbar: {
    previousPage: "Previous page",
    nextPage: "Next page",
    documentPage: "Document page",
    pageOf: (page: number, pageCount: number) => `Page ${page} of ${pageCount}`,
    readyToFinish: "Ready to finish",
    requiredRemaining: (count: number) => `${count} required remaining`,
    lockedValuesVisible: "Locked values visible",
    currentSignerView: "Current signer view",
  },

  zoom: {
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    fit: "Fit",
  },

  pdf: {
    pageLabel: (pageNumber: number) => `Rendered PDF page ${pageNumber}`,
    errorTitle: "We couldn't render this PDF page.",
    errorHint: "Reload the page or try this draft again in a moment.",
    loadingTitle: "Rendering document page...",
    loadingHint:
      "Preparing the source PDF so placed fields stay aligned with the stored page size.",
  },

  emptyPage: {
    title: "No signer fields on this page",
    description:
      "Move between pages to review your assigned fields and any completed values from earlier signers.",
  },

  sidebar: {
    currentSigner: "Current signer",
    readyToFinish: "Ready to finish",
    allComplete: "All required fields complete",
    remaining: (count: number) =>
      `${count} required field${count === 1 ? "" : "s"} remaining`,
    invalidNumber: "A number field marked in red does not hold a number.",
    lockedHint:
      "Previous signer values stay visible but locked. Only your assigned fields are interactive.",
    finish: "Finish",
    assignedFields: "Assigned fields",
    fieldOnPage: (label: string, page: number) => `${label} · Page ${page}`,
  },

  /** Replaces NUMBER_ENTRY_MESSAGE from field-choices.ts. */
  numberEntry: "Enter a number, such as 1250 or 12.5.",
  numberPlaceholder: "Number",
  dropdownRequired: "Choose one",
  dropdownOptional: "No answer",

  status: {
    fixThis: "Fix this",
    complete: "Complete",
    required: "Required",
  },

  finishDialog: {
    title: "Finish signing?",
    description: (envelopeTitle: string, senderName: string) =>
      `You are signing "${envelopeTitle}" from ${senderName}.`,
    providerLevelPrefix: "This document asks for",
    qualified: "a qualified electronic signature",
    advanced: "an advanced electronic signature",
    providerLevelSuffix: ", made with a certificate in your own name.",
    providerNext: (providerName: string) =>
      `Next, ${providerName} asks you to confirm who you are and to approve the signature. When it is done, you come back here. By continuing, you confirm that your signature is intended to be binding for this document.`,
    binding:
      "By clicking Finish, you confirm that your electronic signature is intended to be binding for this document.",
    meaningHeading: "Meaning of your signature",
    meaningCheckbox: "I confirm the meaning of my signature",
    meaningConfirm:
      "I confirm this meaning. My name, the date and time, and this meaning will be printed with my signature.",
    reauthIntro: "Enter your account's email address and password to sign.",
    emailLabel: "Email address",
    passwordLabel: "Password",
    back: "Back",
    preparing: "Preparing...",
    continueTo: (providerName: string) => `Continue to ${providerName}`,
    finishing: "Finishing...",
    finishSigning: "Finish signing",
  },

  consentDialog: {
    title: "Before you sign",
    description: (senderName: string, envelopeTitle: string) =>
      `${senderName} sent you "${envelopeTitle}" to sign electronically.`,
    checkbox: "I agree to use electronic records and signatures",
    decline: "Decline",
    agree: "Agree and continue",
  },

  declineDialog: {
    title: "Decline to sign?",
    description: (senderName: string) =>
      `The sender (${senderName}) will be notified that you declined. This cannot be undone.`,
    reason: "Reason (optional)",
    reasonPlaceholder: "I'd like to discuss some terms first...",
    cancel: "Cancel",
    declining: "Declining...",
    confirm: "Decline to sign",
  },

  signatureModal: {
    description:
      "By signing, you agree that this electronic signature is the legal equivalent of your manual signature.",
    title: { initials: "Add your initials", signature: "Add your signature" },
    typeTab: "Type",
    drawTab: "Draw",
    typeLabel: { initials: "Type initials", signature: "Type signature" },
    typePlaceholder: {
      initials: "Type your initials",
      signature: "Type your signature",
    },
    renderedHint: "Rendered in signature style",
    drawHint: "Draw with mouse or finger",
    canvasCleared: (count: number) =>
      `Canvas cleared ${count} time${count === 1 ? "" : "s"}`,
    clear: "Clear",
    cancel: "Cancel",
    drawnValue: { initials: "Drawn initials", signature: "Drawn signature" },
    apply: { initials: "Apply initials", signature: "Apply signature" },
    canvasLabel: "Draw signature canvas",
  },

  /** Alt text for a signature image on the page. */
  signaturePreviewAlt: {
    initials: "Initials preview",
    signature: "Signature preview",
  } satisfies Record<SignatureKind, string>,
  completedSignatureAlt: (signerName: string, kind: SignatureKind) =>
    `${signerName} completed ${kind}`,

  /** Links at the foot of the signing pages, on a self-hosted install. */
  footer: {
    navLabel: "Footer",
    termsLong: "Terms of Service",
    termsShort: "Terms",
    privacyPolicyLong: "Privacy Policy",
    privacyNoticeLong: "Privacy notice",
    privacyShort: "Privacy",
    permittedUseLong: "What this is for",
    permittedUseShort: "E-signatures",
    poweredBy: (name: string) => `Powered by ${name}`,
  },
};

export type SigningMessages = typeof en;

const fr: SigningMessages = {
  declinedConfirmation: {
    description:
      "Votre refus a bien été enregistré. Aucune autre action n’est nécessaire, et ce lien n’ouvre plus le document.",
    title: "Vous avez refusé de signer",
  },
  unavailable: {
    error: {
      title: "Une erreur s’est produite. Veuillez réessayer.",
      description:
        "Impossible de charger ce document pour le moment. Rechargez la page ou demandez un nouveau lien de signature à l’expéditeur.",
    },
    expired: {
      title: "Ce lien a expiré",
      description: "Demandez un nouveau lien de signature à l’expéditeur.",
    },
    "already-signed": {
      title: "Vous avez déjà signé",
      description: "Vous avez déjà apposé votre signature sur ce document.",
    },
    voided: {
      title: "Cette demande de signature a été annulée",
      description:
        "L’expéditeur a annulé ce document. Aucune action n’est requise de votre part.",
    },
    declined: {
      title: "Cette demande de signature a été refusée",
      description:
        "Un signataire a refusé ce document. Aucune action n’est requise de votre part.",
    },
  },

  done: {
    fallbackTitle: "ce document",
    heading: "C’est terminé.",
    recordedPrefix: "Votre signature a bien été enregistrée pour",
    quotedTitle: (title) => `« ${title} »`,
    recordedSuffix: ".",
    emailNotice:
      "Vous recevrez le document signé par e-mail une fois que tous les signataires auront signé.",
    closeTab: "Vous pouvez fermer cet onglet.",
  },

  verification: {
    methods: {
      access_code: {
        helper:
          "L’expéditeur vous a communiqué ce code séparément, par exemple par téléphone.",
        label: "Code d’accès",
      },
      account: {
        helper:
          "Ce document se signe avec votre propre compte sur ce service. Saisissez le mot de passe que vous utilisez pour vous connecter.",
        label: "Mot de passe",
      },
      email_code: {
        helper:
          "Nous envoyons un code à 6 chiffres à l’adresse à laquelle ce document a été envoyé.",
        label: "Code reçu par e-mail",
      },
    },
    codeSent: (maskedEmail) => `Un code a été envoyé à ${maskedEmail}.`,
    sendFailed: "Le code n’a pas pu être envoyé pour le moment.",
    checkFailed: "Le code n’a pas pu être vérifié pour le moment.",
    heading: "Confirmez votre identité",
    intro: (senderName, envelopeTitle) =>
      `${senderName} demande une vérification avant que vous ouvriez « ${envelopeTitle} ».`,
    step: (step, total) => ` Étape ${String(step)} sur ${String(total)}.`,
    emailHelper: (maskedEmail) =>
      `L’adresse à laquelle ce document a été envoyé (${maskedEmail}).`,
    emailLabel: "Adresse e-mail",
    continue: "Continuer",
    sendNewCode: "Envoyer un nouveau code",
    emailMeCode: "Recevoir un code par e-mail",
  },

  canvasFieldLabels: {
    signature: "Signer",
    initials: "Initiales",
    date: "Date",
    text: "Texte",
    checkbox: "Case à cocher",
    number: "Nombre",
    dropdown: "Choisir",
    radio: "Option",
  },
  fieldLabels: {
    signature: "Signez ici",
    initials: "Initiales ici",
    date: "Date",
    text: "Saisissez du texte",
    checkbox: "Case à cocher",
    number: "Saisissez un nombre",
    dropdown: "Choisissez une option",
    radio: "Option",
  },
  summaryLabels: {
    signature: "Signature",
    initials: "Initiales",
    date: "Date",
    text: "Texte",
    checkbox: "Case à cocher",
    number: "Nombre",
    dropdown: "Liste déroulante",
    radio: "Choix",
  },
  fieldFallback: "Champ",

  values: {
    tapToSign: "Touchez pour signer",
    enterText: "Saisissez du texte",
    notANumber: "Pas un nombre",
    enterNumber: "Saisissez un nombre",
    chooseOne: "Choisissez une option",
    checked: "Cochée",
    unchecked: "Non cochée",
    optional: "Facultatif",
  },

  errors: {
    submit:
      "Impossible de finaliser la signature pour le moment. Rechargez la page ou demandez un nouveau lien de signature à l’expéditeur.",
    decline:
      "Impossible d’enregistrer votre refus pour le moment. Rechargez la page ou demandez un nouveau lien de signature à l’expéditeur.",
    consent: "Votre accord n’a pas pu être enregistré pour le moment.",
  },

  providerProblem: {
    cancelled: (providerName) =>
      `Vous n’avez pas terminé la signature chez ${providerName}. Rien n’a été signé, vous pouvez donc réessayer.`,
    expired: () =>
      "Votre précédente session de signature s’est terminée avant la fin. Rien n’a été signé, vous pouvez donc réessayer.",
    name: (providerName) =>
      `Le certificat utilisé pour signer chez ${providerName} n’est pas au nom auquel ce document a été envoyé. Rien n’a été signé. Si le nom est erroné, demandez à l’expéditeur de renvoyer le document au nom figurant sur votre certificat.`,
    failed: (providerName) =>
      `${providerName} n’a pas pu finaliser votre signature. Rien n’a été signé. Réessayez ou demandez de l’aide à l’expéditeur.`,
  },

  header: {
    from: (senderName) => `De ${senderName}`,
    downloadPdf: "Télécharger le PDF",
    decline: "Refuser",
  },

  toolbar: {
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    documentPage: "Page du document",
    pageOf: (page, pageCount) => `Page ${page} sur ${pageCount}`,
    readyToFinish: "Prêt à terminer",
    requiredRemaining: (count) =>
      count === 1 ? "1 obligatoire restant" : `${count} obligatoires restants`,
    lockedValuesVisible: "Valeurs verrouillées visibles",
    currentSignerView: "Vue du signataire",
  },

  zoom: {
    zoomOut: "Zoom arrière",
    zoomIn: "Zoom avant",
    fit: "Ajuster",
  },

  pdf: {
    pageLabel: (pageNumber) => `Page ${pageNumber} du PDF`,
    errorTitle: "Impossible d’afficher cette page du PDF.",
    errorHint: "Rechargez la page ou réessayez dans un instant.",
    loadingTitle: "Affichage de la page…",
    loadingHint:
      "Préparation du PDF pour que les champs restent alignés sur la page.",
  },

  emptyPage: {
    title: "Aucun champ à remplir sur cette page",
    description:
      "Parcourez les pages pour vérifier les champs qui vous sont attribués et les valeurs déjà saisies par les signataires précédents.",
  },

  sidebar: {
    currentSigner: "Signataire",
    readyToFinish: "Prêt à terminer",
    allComplete: "Tous les champs obligatoires sont remplis",
    remaining: (count) =>
      count === 1
        ? "1 champ obligatoire restant"
        : `${count} champs obligatoires restants`,
    invalidNumber:
      "Un champ numérique signalé en rouge ne contient pas un nombre.",
    lockedHint:
      "Les valeurs des signataires précédents restent visibles mais verrouillées. Seuls les champs qui vous sont attribués sont modifiables.",
    finish: "Terminer",
    assignedFields: "Champs attribués",
    fieldOnPage: (label, page) => `${label} · Page ${page}`,
  },

  numberEntry:
    "Saisissez un nombre, avec un point pour les décimales : par exemple 1250 ou 12.5.",
  numberPlaceholder: "Nombre",
  dropdownRequired: "Choisissez une option",
  dropdownOptional: "Sans réponse",

  status: {
    fixThis: "À corriger",
    complete: "Rempli",
    required: "Obligatoire",
  },

  finishDialog: {
    title: "Terminer la signature ?",
    description: (envelopeTitle, senderName) =>
      `Vous signez « ${envelopeTitle} », envoyé par ${senderName}.`,
    providerLevelPrefix: "Ce document requiert",
    qualified: "une signature électronique qualifiée",
    advanced: "une signature électronique avancée",
    providerLevelSuffix: ", réalisée avec un certificat à votre nom.",
    providerNext: (providerName) =>
      `${providerName} va ensuite vous demander de confirmer votre identité et d’approuver la signature. Une fois terminé, vous reviendrez ici. En continuant, vous confirmez que votre signature vous engage pour ce document.`,
    binding:
      "En cliquant sur Terminer, vous confirmez que votre signature électronique vous engage pour ce document.",
    meaningHeading: "Portée de votre signature",
    meaningCheckbox: "Je confirme la portée de ma signature",
    meaningConfirm:
      "Je confirme cette portée. Mon nom, la date, l’heure et cette mention figureront avec ma signature.",
    reauthIntro:
      "Saisissez l’adresse e-mail et le mot de passe de votre compte pour signer.",
    emailLabel: "Adresse e-mail",
    passwordLabel: "Mot de passe",
    back: "Retour",
    preparing: "Préparation…",
    continueTo: (providerName) => `Continuer vers ${providerName}`,
    finishing: "Finalisation…",
    finishSigning: "Terminer la signature",
  },

  consentDialog: {
    title: "Avant de signer",
    description: (senderName, envelopeTitle) =>
      `${senderName} vous a envoyé « ${envelopeTitle} » à signer électroniquement.`,
    checkbox:
      "J’accepte l’utilisation de documents et de signatures électroniques",
    decline: "Refuser",
    agree: "Accepter et continuer",
  },

  declineDialog: {
    title: "Refuser de signer ?",
    description: (senderName) =>
      `L’expéditeur (${senderName}) sera informé de votre refus. Cette action est irréversible.`,
    reason: "Motif (facultatif)",
    reasonPlaceholder: "J’aimerais d’abord discuter de certaines conditions…",
    cancel: "Annuler",
    declining: "Refus en cours…",
    confirm: "Refuser de signer",
  },

  signatureModal: {
    description:
      "En signant, vous reconnaissez que cette signature électronique a la même valeur juridique que votre signature manuscrite.",
    title: {
      initials: "Ajoutez vos initiales",
      signature: "Ajoutez votre signature",
    },
    typeTab: "Saisir",
    drawTab: "Dessiner",
    typeLabel: {
      initials: "Saisissez vos initiales",
      signature: "Saisissez votre signature",
    },
    typePlaceholder: {
      initials: "Vos initiales",
      signature: "Votre signature",
    },
    renderedHint: "Aperçu en style manuscrit",
    drawHint: "Dessinez à la souris ou au doigt",
    canvasCleared: (count) => `Zone effacée ${count} fois`,
    clear: "Effacer",
    cancel: "Annuler",
    drawnValue: {
      initials: "Initiales dessinées",
      signature: "Signature dessinée",
    },
    apply: {
      initials: "Appliquer les initiales",
      signature: "Appliquer la signature",
    },
    canvasLabel: "Zone de dessin de la signature",
  },

  signaturePreviewAlt: {
    initials: "Aperçu des initiales",
    signature: "Aperçu de la signature",
  },
  completedSignatureAlt: (signerName, kind) =>
    kind === "initials"
      ? `Initiales de ${signerName}`
      : `Signature de ${signerName}`,

  footer: {
    navLabel: "Pied de page",
    termsLong: "Conditions d’utilisation",
    termsShort: "Conditions",
    privacyPolicyLong: "Politique de confidentialité",
    privacyNoticeLong: "Informations sur la confidentialité",
    privacyShort: "Confidentialité",
    permittedUseLong: "À quoi sert ce service",
    permittedUseShort: "Signature électronique",
    poweredBy: (name) => `Propulsé par ${name}`,
  },
};

const dictionaries: Record<Locale, SigningMessages> = { en, fr };

/** The signing pages' messages in the install's language. */
export function signingMessages(locale: Locale): SigningMessages {
  return dictionaries[locale] ?? en;
}
