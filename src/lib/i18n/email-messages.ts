import { SIGNUDOC_NAME } from "../branding.ts";
import { type Locale } from "./locales.ts";

// The words of every email SignuDoc sends to a person, in each language an
// install can speak. Emails to the operator (the contact form, account
// closure requests) stay in English and are not here.
//
// Messages that name something take its words already formatted: for the
// text body as they are, for the HTML body escaped first. A document title
// goes through `quote` (text) or `quoteHtml` (HTML, after escaping), so each
// language puts its own quotation marks around it.
//
// A sentence that ends with a colon in the text body and a full stop in the
// HTML body (where the link follows as a button) is written without its last
// mark; `colon` adds the language's colon.

const NBSP = " ";
const NNBSP = " ";

const en = {
  quote: (text: string) => `"${text}"`,
  quoteHtml: (html: string) => `&ldquo;${html}&rdquo;`,
  colon: (sentence: string) => `${sentence}:`,
  /** The opening of an email to a signer or a sender. */
  hi: (name: string) => `Hi ${name},`,
  /** The opening of a notice from the daily job. */
  hello: (name: string) => `Hello ${name},`,

  signing: {
    invitationSubject: (p: { sender: string; title: string }) =>
      `${p.sender} requested your signature on ${p.title}`,
    invitationIntro: (p: { product: string; sender: string; title: string }) =>
      `${p.sender} sent you ${p.title} through ${p.product}.`,
    reviewAndSignHere: "Review and sign the document here:",
    reviewAndSignLink: "Review and sign the document",
    deadline: (date: string) => `This request expires on ${date}.`,
    noAccountNeeded: (product: string) =>
      `You do not need a ${product} account to sign.`,
    useNewestLink:
      "If you receive a newer invitation or reminder link, use the newest one.",
  },

  reminder: {
    automaticSubject: (p: { sender: string; title: string }) =>
      `Reminder: ${p.sender} is waiting for your signature on ${p.title}`,
    manualSubject: (p: { sender: string; title: string }) =>
      `${p.sender} sent you a reminder to sign ${p.title}`,
    automaticIntro: (p: { product: string; sender: string; title: string }) =>
      `${p.sender} is still waiting for your signature on ${p.title}, sent through ${p.product}.`,
    manualIntro: (p: { product: string; sender: string; title: string }) =>
      `${p.sender} sent you a reminder to sign ${p.title} through ${p.product}.`,
  },

  signingCode: {
    subject: (title: string) => `Your code for ${title}`,
    intro: (p: { product: string; title: string }) =>
      `Your code to open ${p.title} in ${p.product} is:`,
    validity: (minutes: number) =>
      `It works for ${String(minutes)} minutes. If you did not just open a signing link, ignore this email.`,
  },

  void: {
    subject: (p: { sender: string; title: string }) =>
      `${p.title} was voided by ${p.sender}`,
    intro: (p: { product: string; sender: string; title: string }) =>
      `${p.sender} voided ${p.title} in ${p.product}.`,
    noActionNeeded:
      "The signing process has been canceled. No further action is needed.",
  },

  completion: {
    subject: (title: string) => `${title} is fully signed`,
    senderIntro: (p: { product: string; title: string }) =>
      `${p.title} has been fully signed in ${p.product}.`,
    senderFilesReady:
      "The final signed PDF and certificate are ready in your dashboard.",
    senderReviewHere: "Review the completed envelope:",
    senderReviewLink: "Review the completed envelope",
    signerIntro: (p: { product: string; sender: string; title: string }) =>
      `${p.title} from ${p.sender} has been fully signed in ${p.product}.`,
    copyOnly: (sender: string) => `${sender} asked for you to receive a copy.`,
    attached:
      "The completed document and its certificate are attached. Keep them: they are your copy of the agreement.",
    ready: "The completed document and its certificate are ready.",
    downloadLinksText: (days: number) =>
      `Download links (available for ${days} days; an expired link offers to send a new one):`,
    downloadLinksHtml: (days: number) =>
      `Download links are available for ${days} days. An expired link offers to send a new one.`,
    redactedCertificate: (url: string) => `Redacted certificate: ${url}`,
    downloadRedactedCertificate: "Download redacted certificate",
    /** The attached files are named "<title> - signed.pdf" and so on. */
    signedFileSuffix: "signed",
    certificateFileSuffix: "certificate",
  },

  decline: {
    subject: (p: { signer: string; title: string }) =>
      `${p.title} was declined by ${p.signer}`,
    intro: (p: {
      product: string;
      signer: string;
      signerEmail: string;
      title: string;
    }) => `${p.signer} (${p.signerEmail}) declined ${p.title} in ${p.product}.`,
    reasonLabel: "Reason provided:",
    reviewHere: "Review the envelope:",
    reviewLink: "Review the envelope",
  },

  downloads: {
    signedPdf: (url: string) => `Signed PDF: ${url}`,
    downloadSignedPdf: "Download signed PDF",
    renewedSubject: (title: string) => `New download links for ${title}`,
    renewedIntro: (p: { days: number; product: string; title: string }) =>
      `Here are new download links for ${p.title} in ${p.product}. They work for ${String(p.days)} days.`,
    certificate: (url: string) => `Certificate: ${url}`,
    downloadCertificate: "Download certificate",
    keepFiles: "Download and keep the files: they are your copy of the record.",
  },

  expiry: {
    subject: (title: string) => `${title} expired before everyone signed`,
    /** Starts with a space: it follows the sentence before it. */
    waitingOn: (p: { email: string; name: string }) =>
      ` It was still waiting on ${p.name} (${p.email}).`,
    passed: (p: { date: string; title: string; waitingOn: string }) =>
      `The deadline for ${p.title} passed on ${p.date}.${p.waitingOn} Nobody can sign it now.`,
    whatToDo:
      "To give signers more time, open the envelope and set a new deadline. The signing link that was already sent will work again. If the document is no longer needed, void it.",
  },

  retention: {
    subject: (p: { day: string; title: string }) =>
      `${p.title} will be deleted on ${p.day}`,
    notice: (p: { day: string; title: string }) =>
      `Your organization keeps finished documents for a set time. ${p.title} and its audit trail will be deleted on or after ${p.day}.`,
    downloadNow:
      "Download the signed PDF and the certificate now if you need to keep them.",
  },

  signingLock: {
    subject: (name: string) => `Signing locked for ${name}`,
    what: (p: {
      attempts: number;
      email: string;
      name: string;
      product: string;
    }) =>
      `${p.name} <${p.email}> gave the wrong password ${p.attempts} times in a row while signing on ${p.product}.`,
    unlock:
      "Their account can no longer sign until an administrator unlocks it under Settings, People.",
    checkFirst:
      "If this was not them, someone may be trying to sign in their name. Check with them before unlocking.",
  },

  auth: {
    ignoreIfNotYou: "If you didn't request this, you can ignore this email.",
    verifySubject: (product: string) => `Verify your ${product} email`,
    verifyIntro: (product: string) =>
      `Verify your email address to finish setting up your ${product} sender account`,
    verifyLink: "Verify your email",
    changeEmailSubject: (product: string) =>
      `Confirm your ${product} email change`,
    changeEmailIntro: (p: { newEmail: string; product: string }) =>
      `Confirm that you want to change your ${p.product} sender email to ${p.newEmail}`,
    changeEmailLink: "Confirm this email change",
    resetSubject: (product: string) => `Reset your ${product} password`,
    resetIntro: (product: string) =>
      `Use the link below to reset your ${product} password`,
    resetLink: "Reset your password",
    resetIgnoreIfNotYou:
      "If you didn't request this reset, you can ignore this email.",
  },

  footer: {
    terms: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    privacyNotice: "Privacy notice",
    contact: "Contact",
    questions: (address: string) => `Questions? Contact ${address}.`,
    sentBy: (organization: string) =>
      `Sent by ${organization} using ${SIGNUDOC_NAME}.`,
    sentUsing: `Sent using ${SIGNUDOC_NAME}.`,
  },

  testEmail: {
    subject: (product: string) => `Test email from ${product}`,
    body: (product: string) =>
      `This is a test message from ${product}. If you are reading it, email is working.`,
  },
};

export type EmailMessages = typeof en;

const fr: EmailMessages = {
  quote: (text) => `«${NBSP}${text}${NBSP}»`,
  quoteHtml: (html) => `&laquo;&nbsp;${html}&nbsp;&raquo;`,
  colon: (sentence) => `${sentence}${NBSP}:`,
  hi: (name) => `Bonjour ${name},`,
  hello: (name) => `Bonjour ${name},`,

  signing: {
    invitationSubject: (p) => `${p.sender} vous demande de signer ${p.title}`,
    invitationIntro: (p) =>
      `${p.sender} vous a envoyé ${p.title} via ${p.product}.`,
    reviewAndSignHere: `Consultez et signez le document ici${NBSP}:`,
    reviewAndSignLink: "Consulter et signer le document",
    deadline: (date) => `Cette demande de signature expire le ${date}.`,
    noAccountNeeded: (product) =>
      `Vous n’avez pas besoin de compte ${product} pour signer.`,
    useNewestLink:
      "Si vous recevez une invitation ou une relance plus récente, utilisez le lien le plus récent.",
  },

  reminder: {
    automaticSubject: (p) =>
      `Relance${NBSP}: ${p.sender} attend votre signature sur ${p.title}`,
    manualSubject: (p) => `${p.sender} vous relance pour signer ${p.title}`,
    automaticIntro: (p) =>
      `${p.sender} attend toujours votre signature sur ${p.title}, document envoyé via ${p.product}.`,
    manualIntro: (p) =>
      `${p.sender} vous relance pour signer ${p.title} via ${p.product}.`,
  },

  signingCode: {
    subject: (title) => `Votre code pour ${title}`,
    intro: (p) => `Votre code pour ouvrir ${p.title} dans ${p.product}${NBSP}:`,
    validity: (minutes) =>
      `Il est valable ${String(minutes)} minutes. Si vous n’avez pas ouvert de lien de signature à l’instant, ignorez cet e-mail.`,
  },

  void: {
    subject: (p) => `${p.sender} a annulé la demande de signature ${p.title}`,
    intro: (p) =>
      `${p.sender} a annulé la demande de signature ${p.title} dans ${p.product}.`,
    noActionNeeded:
      "Le processus de signature est interrompu. Vous n’avez rien d’autre à faire.",
  },

  completion: {
    subject: (title) => `Le document ${title} est entièrement signé`,
    senderIntro: (p) =>
      `Le document ${p.title} a été signé par tous les signataires dans ${p.product}.`,
    senderFilesReady:
      "Le PDF signé final et le certificat sont disponibles dans votre tableau de bord.",
    senderReviewHere: `Consultez la demande de signature terminée${NBSP}:`,
    senderReviewLink: "Consulter la demande de signature terminée",
    signerIntro: (p) =>
      `Le document ${p.title} envoyé par ${p.sender} a été signé par tous les signataires dans ${p.product}.`,
    copyOnly: (sender) => `${sender} a demandé que vous en receviez une copie.`,
    attached: `Le document finalisé et son certificat sont joints à cet e-mail. Conservez-les${NBSP}: ils constituent votre exemplaire de l’accord.`,
    ready: "Le document finalisé et son certificat sont disponibles.",
    downloadLinksText: (days) =>
      `Liens de téléchargement (valables ${days} jours${NNBSP}; un lien expiré propose d’en envoyer un nouveau)${NBSP}:`,
    downloadLinksHtml: (days) =>
      `Les liens de téléchargement sont valables ${days} jours. Un lien expiré propose d’en envoyer un nouveau.`,
    redactedCertificate: (url) => `Certificat expurgé${NBSP}: ${url}`,
    downloadRedactedCertificate: "Télécharger le certificat expurgé",
    signedFileSuffix: "signé",
    certificateFileSuffix: "certificat",
  },

  decline: {
    subject: (p) => `${p.signer} a refusé de signer ${p.title}`,
    intro: (p) =>
      `${p.signer} (${p.signerEmail}) a refusé de signer ${p.title} dans ${p.product}.`,
    reasonLabel: `Motif indiqué${NBSP}:`,
    reviewHere: `Consultez la demande de signature${NBSP}:`,
    reviewLink: "Consulter la demande de signature",
  },

  downloads: {
    signedPdf: (url) => `PDF signé${NBSP}: ${url}`,
    downloadSignedPdf: "Télécharger le PDF signé",
    renewedSubject: (title) => `Nouveaux liens de téléchargement pour ${title}`,
    renewedIntro: (p) =>
      `Voici de nouveaux liens de téléchargement pour ${p.title} dans ${p.product}. Ils sont valables ${String(p.days)} jours.`,
    certificate: (url) => `Certificat${NBSP}: ${url}`,
    downloadCertificate: "Télécharger le certificat",
    keepFiles: `Téléchargez et conservez ces fichiers${NBSP}: ils constituent votre exemplaire du dossier.`,
  },

  expiry: {
    subject: (title) =>
      `Le document ${title} a expiré avant d’être signé par tous les signataires`,
    waitingOn: (p) =>
      ` Il attendait encore la signature de ${p.name} (${p.email}).`,
    passed: (p) =>
      `La date limite du document ${p.title} est passée le ${p.date}.${p.waitingOn} Plus personne ne peut le signer.`,
    whatToDo:
      "Pour laisser plus de temps aux signataires, ouvrez la demande de signature et fixez une nouvelle date limite. Le lien de signature déjà envoyé fonctionnera de nouveau. Si le document n’est plus nécessaire, annulez la demande de signature.",
  },

  retention: {
    subject: (p) => `Le document ${p.title} sera supprimé le ${p.day}`,
    notice: (p) =>
      `Votre organisation conserve les documents finalisés pendant une durée définie. Le document ${p.title} et sa piste d’audit seront supprimés à partir du ${p.day}.`,
    downloadNow:
      "Téléchargez dès maintenant le PDF signé et le certificat si vous devez les conserver.",
  },

  signingLock: {
    subject: (name) => `Signature bloquée pour ${name}`,
    what: (p) =>
      `${p.name} <${p.email}> a saisi un mot de passe erroné ${p.attempts} fois de suite en signant sur ${p.product}.`,
    unlock:
      "Son compte ne peut plus signer tant qu’un administrateur ne l’a pas débloqué dans Settings, People.",
    checkFirst:
      "Si ce n’était pas cette personne, quelqu’un essaie peut-être de signer en son nom. Vérifiez auprès d’elle avant de débloquer le compte.",
  },

  auth: {
    ignoreIfNotYou:
      "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.",
    verifySubject: (product) => `Vérifiez votre adresse e-mail ${product}`,
    verifyIntro: (product) =>
      `Vérifiez votre adresse e-mail pour terminer la création de votre compte expéditeur ${product}`,
    verifyLink: "Vérifier votre adresse e-mail",
    changeEmailSubject: (product) =>
      `Confirmez le changement de votre adresse e-mail ${product}`,
    changeEmailIntro: (p) =>
      `Confirmez que vous souhaitez remplacer l’adresse e-mail de votre compte expéditeur ${p.product} par ${p.newEmail}`,
    changeEmailLink: "Confirmer le changement d’adresse e-mail",
    resetSubject: (product) => `Réinitialisez votre mot de passe ${product}`,
    resetIntro: (product) =>
      `Utilisez le lien ci-dessous pour réinitialiser votre mot de passe ${product}`,
    resetLink: "Réinitialiser votre mot de passe",
    resetIgnoreIfNotYou:
      "Si vous n’avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.",
  },

  footer: {
    terms: "Conditions d’utilisation",
    privacyPolicy: "Politique de confidentialité",
    privacyNotice: "Informations sur la confidentialité",
    contact: "Contact",
    questions: (address) => `Des questions${NNBSP}? Écrivez à ${address}.`,
    sentBy: (organization) =>
      `Envoyé par ${organization} avec ${SIGNUDOC_NAME}.`,
    sentUsing: `Envoyé avec ${SIGNUDOC_NAME}.`,
  },

  testEmail: {
    subject: (product) => `E-mail de test de ${product}`,
    body: (product) =>
      `Ceci est un message de test envoyé par ${product}. Si vous le lisez, l’envoi d’e-mails fonctionne.`,
  },
};

const MESSAGES: Record<Locale, EmailMessages> = { en, fr };

/** The words of SignuDoc's emails in a language this install speaks. */
export function emailMessages(locale: Locale): EmailMessages {
  // A caller that has no language (an old branding object) gets English.
  return MESSAGES[locale] ?? en;
}
