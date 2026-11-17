// What the rest of the app says (sign-in, sign-up, first-run setup, the
// shells around every page, shared widgets and the signer privacy notice),
// in each language an install can speak. English is written first; every
// other dictionary has its type, so the compiler lists any message it is
// missing.
//
// Errors the server sends arrive already worded and are not repeated here;
// only what the browser says on its own is.

import type { Locale } from "./locales.ts";

const en = {
  common: {
    cancel: "Cancel",
    continue: "Continue",
    email: "Email",
    emailPlaceholder: "jane@acmecorp.com",
    enterValidEmail: "Enter a valid email address",
    goToLogIn: "Go to log in",
    logIn: "Log in",
    or: "or",
    password: "Password",
    passwordBreached: "Choose a password that hasn't appeared in a breach",
    passwordMinLength: "Password must be at least 15 characters",
    passwordMinLengthHelper: "Must be at least 15 characters",
    passwordPlaceholder: "Enter a password",
    resendVerification: "Resend verification email",
    resendVerificationFailed: "We couldn't resend the verification email.",
    sending: "Sending...",
    signOut: "Sign out",
    signUp: "Sign up",
    signingOut: "Signing out...",
    somethingWentWrong: "Something went wrong. Please try again.",
    verificationSent: "Verification email sent. Check your inbox.",
  },

  login: {
    eyebrow: "Log in",
    title: "Welcome back",
    verificationRequired:
      "Verify your email before logging in. Check your inbox for a fresh link.",
    invalidResetLink: "This reset link is invalid or has expired.",
    enterPassword: "Enter your password",
    locked: "Too many wrong passwords. Try again in 15 minutes.",
    invalidCredentials: "Invalid email or password. Please try again.",
    resetLinkFailed: "We couldn't send the reset link. Please try again.",
    resetLinkSent: "Check your email for a reset link.",
    submitting: "Logging in...",
    passwordInstead: "Sign in with a password instead",
    forgotPassword: "Forgot your password?",
    noAccount: "Don't have an account?",
  },

  forgotPassword: {
    title: "Reset your password",
    description:
      "Enter the email address associated with your account and we'll send you a reset link.",
    submit: "Send reset link",
  },

  resetPassword: {
    eyebrow: "Reset password",
    title: "Create a new password",
    newPassword: "New password",
    success: "Your password has been reset. Log in with your new password.",
    submitting: "Updating password...",
    submit: "Update password",
  },

  secondStep: {
    eyebrow: "Two-step sign-in",
    enterSixDigits: "Enter the 6-digit code your authenticator app shows.",
    enterBackupCode: "Enter one of your backup codes.",
    invalidCode:
      "That code is not right. Check the time on your phone and try the newest code.",
    invalidBackupCode: "That backup code is not right, or it was used before.",
    locked: "Too many wrong codes. Two-step sign-in is locked for 15 minutes.",
    tooManyAttempts: "Too many wrong codes. Log in again to get a new try.",
    tooSlow: "That took too long. Log in again.",
    titleBackup: "Enter a backup code",
    titleCode: "Enter your code",
    descriptionBackup: "Each backup code works once.",
    descriptionCode:
      "Open your authenticator app and enter the 6-digit code it shows.",
    labelBackup: "Backup code",
    labelCode: "6-digit code",
    submitting: "Checking...",
    useApp: "Use a code from your app instead",
    useBackup: "Lost your phone? Use a backup code",
  },

  sso: {
    continueWith: (name: string) => `Continue with ${name}`,
    signupNotAllowed:
      "That address does not have an account here, and this site's sign-up rule does not let it make one. Ask an administrator.",
    cancelled: "Sign-in was cancelled.",
    emailNotFound:
      "Your identity provider did not share an email address, so you could not be signed in. Ask your IT team to include the email claim.",
    emailNotVerified:
      "An account with this address already exists and its address is not confirmed yet. Sign in with your password once, or ask an administrator.",
    linkedToOtherUser:
      "This sign-in is already tied to a different account here. Ask an administrator.",
    failed: "Single sign-on did not finish. Please try again.",
  },

  signup: {
    eyebrow: "Create account",
    title: "Create your account",
    successDefault: "Check your email to verify your sender account.",
    fullName: "Full name",
    fullNamePlaceholder: "Jane Smith",
    enterFullName: "Enter your full name",
    submitting: "Creating account...",
    alreadyHaveAccount: "Already have an account?",
    closedTitle: "Sign-up is closed",
    closedDescription:
      "New accounts are not being accepted on this site. If you were sent a document to sign, use the link in that email. You do not need an account.",
    notAccepted: "New accounts are not being accepted.",
    alreadyRegistered: "This email is already registered",
  },

  twoStepSetup: {
    eyebrow: "One more step",
    title: "Set up two-step sign-in",
    description: (productName: string, email: string) =>
      `Your organization requires two-step sign-in on ${productName}. Set it up for ${email} to continue. It takes about a minute with an authenticator app on your phone.`,
  },

  authShell: {
    navLabel: "Public navigation",
    loadingLabel: "Loading authentication page",
    errorTitle: "Something went wrong.",
    errorDescription: "This page hit an unexpected error. Please try again.",
    tryAgain: "Try again",
  },

  appShell: {
    navLabel: "Workspace",
    accountMenu: (name: string) => `Account menu for ${name}`,
    settings: "Settings",
    emailNoticeTitle: "Email is not set up yet.",
    emailNoticeBody:
      "Until it is, signers and new users will not receive messages from this site.",
    finishEmailSetup: "Finish email setup",
    nav: {
      documents: "Documents",
      templates: "Templates",
      "new-envelope": "New envelope",
      settings: "Settings",
    },
  },

  publicSession: {
    openMenu: "Open account menu",
    dashboard: "Dashboard",
    logOut: "Log out",
  },

  publicDocument: {
    lastUpdated: (date: string) => `Last updated ${date}`,
  },

  footer: {
    navLabel: "Footer",
    permittedUseLong: "What this is for",
    permittedUseShort: "E-signatures",
    poweredBy: (name: string) => `Powered by ${name}`,
    privacyNoticeLong: "Privacy notice",
    privacyPolicyLong: "Privacy Policy",
    privacyShort: "Privacy",
    termsLong: "Terms of Service",
    termsShort: "Terms",
  },

  canvas: {
    loading: "Loading...",
    next: "Next",
  },

  statusPanel: {
    error: "Error",
    loading: "Loading",
    ready: "Ready",
  },

  stepIndicator: {
    label: "Progress",
  },

  dialog: {
    close: "Close",
  },

  thumbnail: {
    firstPageOf: (title: string) => `First page of ${title}`,
  },

  zoom: {
    fit: "Fit",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },

  notFound: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
    goToDashboard: "Go to Dashboard",
    goToHome: "Go to Home",
  },

  contact: {
    metaTitle: "Contact | SignuDoc",
    metaDescription:
      "Get in touch with SignuDoc for support, privacy questions, accessibility requests, or legal inquiries.",
    title: "Contact",
    description:
      "Use the form below for product support, privacy requests, accessibility accommodations, legal notices, or questions about a document sent through SignuDoc.",
    lastUpdated: "March 23, 2026",
    enterName: "Enter your name",
    messageTooLong: "Message must be 5000 characters or fewer",
    enterMessage: "Enter a message",
    sent: (email: string) =>
      `Your message was sent. We’ll follow up at ${email} if we need more detail.`,
    name: "Name",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@example.com",
    message: "Message",
    messagePlaceholder:
      "Tell us what you need, and include any account email, sender name, document title, or link that helps us identify the request.",
    send: "Send message",
  },

  setup: {
    metaTitle: "Set up",
    metaDescription: "Create the administrator account for this site.",
    pill: "Setup",
    genericError: "Setup could not be completed. Please try again.",
    noDatabaseTitle: "Connect a database",
    noDatabaseBody:
      "This site does not have a database yet, so there is nowhere to keep accounts or documents.",
    noDatabaseVercel:
      "In Vercel, open this project's Storage tab, add a Neon Postgres database and connect it to the project. Then deploy again and reload this page.",
    noDatabaseSelfBefore:
      "Set the DATABASE_URL environment variable to a Postgres database, run ",
    noDatabaseSelfAfter: ", restart the app and reload this page.",
    unmigratedTitle: "The database is not ready",
    unmigratedBody:
      "The database is connected, but its tables have not been created or are from an older version.",
    unmigratedVercel:
      "Deploy this project again. Tables are created during a production deployment. Then reload this page.",
    unmigratedSelfBefore: "Run ",
    unmigratedSelfAfter: ", restart the app and reload this page.",
    claimTitle: "Choose an administrator",
    claimTokenBody:
      "This site already has accounts but no administrator. To choose one, set the SETUP_TOKEN environment variable to a secret of your own, deploy again, and come back to this page.",
    claimTokenWhy:
      "The token is asked for here, so that only someone who controls the deployment can become the administrator.",
    claimSignInBody:
      "This site already has accounts but no administrator. Sign in with the account that should become the administrator, then open this page again.",
    signupStartDomains: (domain: string) =>
      `Other people with an @${domain} address will be able to create accounts. You can change this in Settings.`,
    signupStartOnlyYou:
      "Only you will have an account to begin with. You can let other people in from Settings.",
    createTitle: "Set up your site",
    createIntro:
      "You are the first person here. The account you create now is the administrator: it can change these settings later and decide who else may sign up.",
    claimIntro: (email: string) =>
      `You are signed in as ${email}. This account will become the administrator, who decides who may sign up and how email is sent.`,
    checkSender: "Check the address this site sends email from.",
    organizationName: "Organization name",
    organizationNameHelper:
      "Shown in the header and in every email this site sends.",
    organizationNamePlaceholder: "Acme Corp",
    supportEmail: "Support email",
    supportEmailHelper:
      "Signers and people with an account are told to write here for help, and replies to this site's emails come here. You can change it in Settings.",
    supportEmailPlaceholder: "help@acmecorp.com",
    yourName: "Your name",
    yourEmail: "Your email",
    passwordHelper: "15 to 128 characters. Let your password manager make one.",
    setupToken: "Setup token",
    setupTokenHelper:
      "The value of the SETUP_TOKEN environment variable on this deployment.",
    submitting: "Setting up...",
    finish: "Finish setup",
    become: "Become the administrator",
    notRightAccount: "Not the right account?",
    logInAsSomeoneElse: "Log in as someone else",
    senderLegend: "Send email from",
    senderIntro:
      "Optional. Email is sent through Resend from a domain your organization owns. Leave the domain empty to decide later in Settings.",
    senderDomain: "Your domain",
    senderDomainIntegration:
      "The domain the Resend integration was set up with on Vercel.",
    senderDomainGuess:
      "Filled in from this site's address and the emails above. Change it if your organization uses another domain.",
    senderDomainDefault:
      "The domain your organization's email uses, such as acmecorp.com.",
    senderSubdomain: "Subdomain",
    senderSubdomainPlaceholder: "none",
    theDomain: "the domain",
    senderSubdomainRecommended: (from: string, root: string) =>
      `Recommended. Mail comes from ${from}, so its DNS records and sending reputation stay apart from your everyday email. Clear it to send from ${root} itself.`,
    senderSubdomainNone: (root: string, example: string) =>
      `Mail will come from ${root} itself. A subdomain such as ${example} keeps it apart from your everyday email.`,
    senderAddress: "Address",
    senderAddressHelper:
      "Nobody needs to read this mailbox: replies go to the support email.",
    senderPreviewBefore: "Emails will come from",
    senderPreviewAfter: (sendingDomain: string) =>
      `. If Resend is connected, setup adds ${sendingDomain} to it, and the next screen lists the DNS records to add where your domain is managed.`,
  },

  signerPrivacy: {
    title: "Privacy notice for signers",
    metaDescription:
      "How your information is used when you sign a document here.",
    lastUpdated: "2026-11-13",
    organizationFallback: "The organization that runs this site",
    description: (organization: string) =>
      `${organization} uses this site to send documents for electronic signature. This notice says what is collected about you when you sign, why, and what you can do about it.`,
    retentionDays: (days: string) =>
      `Finished documents and their audit trails are deleted ${days} days after they are finished.`,
    retentionKept:
      "Finished documents and their audit trails are kept until the organization deletes them, because they are evidence of an agreement and many must be kept for years by law.",
    responsibleHeading: "Who is responsible",
    responsible: (organization: string) =>
      `${organization} is responsible for your information (the “controller”).`,
    contactAt: "Contact them at",
    contactThroughSender:
      "Contact them through the person who sent you the document.",
    collectedHeading: "What is collected",
    collectedIdentity: "Your name and email address, given by the sender.",
    collectedInput:
      "What you enter: your signature or initials (typed or drawn), dates, text and checkboxes, or your reason for declining.",
    collectedEvidence:
      "Evidence of signing: when you opened, agreed and signed, your IP address, your browser's description of itself, and the checks you passed (such as an emailed code).",
    collectedEmails: "Records of the emails sent to you about the document.",
    basisHeading: "Why, and on what basis",
    basis:
      "To let you review and sign the document, to deliver copies, and to keep evidence of who signed what and when. The basis is taking steps for or performing a contract you are part of (GDPR Article 6(1)(b)), the organization's legitimate interest in being able to prove the agreement (Article 6(1)(f)), and any legal duty to keep records (Article 6(1)(c)).",
    recipientsHeading: "Who else handles it",
    recipients: (organization: string) =>
      `The other parties to the document see your name, email and signature. The services that run this site process it for ${organization}: the hosting provider (Vercel), the database provider (such as Neon), file storage (Vercel Blob) and the email provider (Resend). Some are based in the United States; where information leaves the European Economic Area, it is protected by the EU-US Data Privacy Framework or by standard contractual clauses.`,
    retentionHeading: "How long it is kept",
    draftRetention: (days: string) =>
      `Unsent drafts are deleted after ${days} days without changes.`,
    rightsHeading: "Your rights",
    rights: (organization: string) =>
      `You can ask ${organization} for a copy of your information, to correct it, to restrict or object to its use, or to erase it. A signed record may be kept despite a request to erase it while it is needed as evidence or by law (GDPR Article 17(3)). You can also complain to the data protection authority where you live or work.`,
  },
};

export type AppMessages = typeof en;

const fr: AppMessages = {
  common: {
    cancel: "Annuler",
    continue: "Continuer",
    email: "E-mail",
    emailPlaceholder: "jeanne@acmecorp.com",
    enterValidEmail: "Saisissez une adresse e-mail valide",
    goToLogIn: "Aller à la connexion",
    logIn: "Se connecter",
    or: "ou",
    password: "Mot de passe",
    passwordBreached:
      "Choisissez un mot de passe qui n’est apparu dans aucune fuite de données",
    passwordMinLength: "Le mot de passe doit contenir au moins 15 caractères",
    passwordMinLengthHelper: "Au moins 15 caractères",
    passwordPlaceholder: "Saisissez un mot de passe",
    resendVerification: "Renvoyer l’e-mail de vérification",
    resendVerificationFailed:
      "Impossible de renvoyer l’e-mail de vérification.",
    sending: "Envoi…",
    signOut: "Se déconnecter",
    signUp: "Créer un compte",
    signingOut: "Déconnexion…",
    somethingWentWrong: "Une erreur s’est produite. Veuillez réessayer.",
    verificationSent:
      "E-mail de vérification envoyé. Consultez votre boîte de réception.",
  },

  login: {
    eyebrow: "Connexion",
    title: "Bon retour parmi nous",
    verificationRequired:
      "Vérifiez votre adresse e-mail avant de vous connecter. Un nouveau lien vous attend dans votre boîte de réception.",
    invalidResetLink: "Ce lien de réinitialisation est invalide ou a expiré.",
    enterPassword: "Saisissez votre mot de passe",
    locked: "Trop de mots de passe erronés. Réessayez dans 15 minutes.",
    invalidCredentials: "E-mail ou mot de passe incorrect. Veuillez réessayer.",
    resetLinkFailed:
      "Impossible d’envoyer le lien de réinitialisation. Veuillez réessayer.",
    resetLinkSent: "Un lien de réinitialisation vous a été envoyé par e-mail.",
    submitting: "Connexion…",
    passwordInstead: "Se connecter plutôt avec un mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    noAccount: "Vous n’avez pas de compte ?",
  },

  forgotPassword: {
    title: "Réinitialiser votre mot de passe",
    description:
      "Saisissez l’adresse e-mail associée à votre compte : nous vous enverrons un lien de réinitialisation.",
    submit: "Envoyer le lien",
  },

  resetPassword: {
    eyebrow: "Réinitialisation",
    title: "Choisissez un nouveau mot de passe",
    newPassword: "Nouveau mot de passe",
    success:
      "Votre mot de passe a été réinitialisé. Connectez-vous avec votre nouveau mot de passe.",
    submitting: "Mise à jour…",
    submit: "Mettre à jour le mot de passe",
  },

  secondStep: {
    eyebrow: "Connexion en deux étapes",
    enterSixDigits:
      "Saisissez le code à 6 chiffres affiché par votre application d’authentification.",
    enterBackupCode: "Saisissez l’un de vos codes de secours.",
    invalidCode:
      "Ce code est incorrect. Vérifiez l’heure de votre téléphone et essayez le code le plus récent.",
    invalidBackupCode:
      "Ce code de secours est incorrect ou a déjà été utilisé.",
    locked:
      "Trop de codes erronés. La connexion en deux étapes est bloquée pendant 15 minutes.",
    tooManyAttempts: "Trop de codes erronés. Reconnectez-vous pour réessayer.",
    tooSlow: "Le délai est dépassé. Reconnectez-vous.",
    titleBackup: "Saisissez un code de secours",
    titleCode: "Saisissez votre code",
    descriptionBackup: "Chaque code de secours ne fonctionne qu’une fois.",
    descriptionCode:
      "Ouvrez votre application d’authentification et saisissez le code à 6 chiffres qu’elle affiche.",
    labelBackup: "Code de secours",
    labelCode: "Code à 6 chiffres",
    submitting: "Vérification…",
    useApp: "Utiliser plutôt un code de votre application",
    useBackup: "Téléphone perdu ? Utilisez un code de secours",
  },

  sso: {
    continueWith: (name) => `Continuer avec ${name}`,
    signupNotAllowed:
      "Cette adresse n’a pas de compte ici, et les règles d’inscription de ce site ne lui permettent pas d’en créer un. Contactez un administrateur.",
    cancelled: "La connexion a été annulée.",
    emailNotFound:
      "Votre fournisseur d’identité n’a pas transmis d’adresse e-mail : la connexion est impossible. Demandez à votre équipe informatique d’inclure l’attribut e-mail.",
    emailNotVerified:
      "Un compte existe déjà avec cette adresse, mais elle n’est pas encore confirmée. Connectez-vous une fois avec votre mot de passe, ou contactez un administrateur.",
    linkedToOtherUser:
      "Cette connexion est déjà associée à un autre compte ici. Contactez un administrateur.",
    failed: "L’authentification unique n’a pas abouti. Veuillez réessayer.",
  },

  signup: {
    eyebrow: "Créer un compte",
    title: "Créez votre compte",
    successDefault:
      "Consultez vos e-mails pour vérifier votre compte expéditeur.",
    fullName: "Nom complet",
    fullNamePlaceholder: "Jeanne Martin",
    enterFullName: "Saisissez votre nom complet",
    submitting: "Création du compte…",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    closedTitle: "Les inscriptions sont fermées",
    closedDescription:
      "Ce site n’accepte pas de nouveaux comptes. Si vous avez reçu un document à signer, utilisez le lien figurant dans l’e-mail : vous n’avez pas besoin de compte.",
    notAccepted: "Les nouveaux comptes ne sont pas acceptés.",
    alreadyRegistered: "Cette adresse e-mail est déjà enregistrée",
  },

  twoStepSetup: {
    eyebrow: "Encore une étape",
    title: "Activez la connexion en deux étapes",
    description: (productName, email) =>
      `Votre organisation exige la connexion en deux étapes sur ${productName}. Activez-la pour ${email} afin de continuer. Comptez environ une minute avec une application d’authentification sur votre téléphone.`,
  },

  authShell: {
    navLabel: "Navigation publique",
    loadingLabel: "Chargement de la page de connexion",
    errorTitle: "Une erreur s’est produite.",
    errorDescription:
      "Cette page a rencontré une erreur inattendue. Veuillez réessayer.",
    tryAgain: "Réessayer",
  },

  appShell: {
    navLabel: "Espace de travail",
    accountMenu: (name) => `Menu du compte de ${name}`,
    settings: "Paramètres",
    emailNoticeTitle: "L’envoi d’e-mails n’est pas encore configuré.",
    emailNoticeBody:
      "D’ici là, les signataires et les nouveaux utilisateurs ne recevront aucun message de ce site.",
    finishEmailSetup: "Terminer la configuration des e-mails",
    nav: {
      documents: "Documents",
      templates: "Modèles",
      "new-envelope": "Nouvelle demande de signature",
      settings: "Paramètres",
    },
  },

  publicSession: {
    openMenu: "Ouvrir le menu du compte",
    dashboard: "Tableau de bord",
    logOut: "Se déconnecter",
  },

  publicDocument: {
    lastUpdated: (date) => `Dernière mise à jour : ${date}`,
  },

  footer: {
    navLabel: "Pied de page",
    permittedUseLong: "À quoi sert ce service",
    permittedUseShort: "Signature électronique",
    poweredBy: (name) => `Propulsé par ${name}`,
    privacyNoticeLong: "Informations sur la confidentialité",
    privacyPolicyLong: "Politique de confidentialité",
    privacyShort: "Confidentialité",
    termsLong: "Conditions d’utilisation",
    termsShort: "Conditions",
  },

  canvas: {
    loading: "Chargement…",
    next: "Suivant",
  },

  statusPanel: {
    error: "Erreur",
    loading: "Chargement",
    ready: "Prêt",
  },

  stepIndicator: {
    label: "Progression",
  },

  dialog: {
    close: "Fermer",
  },

  thumbnail: {
    firstPageOf: (title) => `Première page de ${title}`,
  },

  zoom: {
    fit: "Ajuster",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
  },

  notFound: {
    title: "Page introuvable",
    description: "La page que vous cherchez n’existe pas ou a été déplacée.",
    goToDashboard: "Aller au tableau de bord",
    goToHome: "Aller à l’accueil",
  },

  contact: {
    metaTitle: "Contact | SignuDoc",
    metaDescription:
      "Contactez SignuDoc pour une demande d’assistance, une question sur la confidentialité, une demande d’accessibilité ou une question juridique.",
    title: "Contact",
    description:
      "Utilisez le formulaire ci-dessous pour une demande d’assistance, une demande relative à vos données personnelles, un besoin d’accessibilité, une notification juridique ou une question sur un document envoyé via SignuDoc.",
    lastUpdated: "23 mars 2026",
    enterName: "Saisissez votre nom",
    messageTooLong: "Le message ne doit pas dépasser 5000 caractères",
    enterMessage: "Saisissez un message",
    sent: (email) =>
      `Votre message a été envoyé. Nous vous répondrons à ${email} si nous avons besoin de précisions.`,
    name: "Nom",
    namePlaceholder: "Votre nom",
    emailPlaceholder: "vous@exemple.fr",
    message: "Message",
    messagePlaceholder:
      "Décrivez votre besoin et indiquez tout élément qui nous aide à identifier la demande : e-mail du compte, nom de l’expéditeur, titre du document ou lien.",
    send: "Envoyer le message",
  },

  setup: {
    metaTitle: "Installation",
    metaDescription: "Créez le compte administrateur de ce site.",
    pill: "Installation",
    genericError: "L’installation n’a pas pu aboutir. Veuillez réessayer.",
    noDatabaseTitle: "Connectez une base de données",
    noDatabaseBody:
      "Ce site n’a pas encore de base de données : il n’y a nulle part où conserver les comptes ni les documents.",
    noDatabaseVercel:
      "Dans Vercel, ouvrez l’onglet Storage de ce projet, ajoutez une base de données Neon Postgres et connectez-la au projet. Redéployez ensuite et rechargez cette page.",
    noDatabaseSelfBefore:
      "Définissez la variable d’environnement DATABASE_URL sur une base de données Postgres, exécutez ",
    noDatabaseSelfAfter: ", redémarrez l’application et rechargez cette page.",
    unmigratedTitle: "La base de données n’est pas prête",
    unmigratedBody:
      "La base de données est connectée, mais ses tables n’ont pas été créées ou datent d’une version antérieure.",
    unmigratedVercel:
      "Redéployez ce projet : les tables sont créées lors d’un déploiement en production. Rechargez ensuite cette page.",
    unmigratedSelfBefore: "Exécutez ",
    unmigratedSelfAfter: ", redémarrez l’application et rechargez cette page.",
    claimTitle: "Désignez un administrateur",
    claimTokenBody:
      "Ce site a déjà des comptes, mais aucun administrateur. Pour en désigner un, définissez la variable d’environnement SETUP_TOKEN avec un secret de votre choix, redéployez, puis revenez sur cette page.",
    claimTokenWhy:
      "Le jeton est demandé ici afin que seule une personne qui contrôle le déploiement puisse devenir administrateur.",
    claimSignInBody:
      "Ce site a déjà des comptes, mais aucun administrateur. Connectez-vous avec le compte qui doit devenir administrateur, puis rouvrez cette page.",
    signupStartDomains: (domain) =>
      `Les autres personnes disposant d’une adresse @${domain} pourront créer un compte. Vous pourrez modifier ce réglage dans les paramètres.`,
    signupStartOnlyYou:
      "Au départ, seul votre compte existera. Vous pourrez ouvrir l’accès à d’autres personnes depuis les paramètres.",
    createTitle: "Installez votre site",
    createIntro:
      "Vous êtes la première personne ici. Le compte que vous créez maintenant est celui de l’administrateur : il pourra modifier ces réglages plus tard et décider qui d’autre peut créer un compte.",
    claimIntro: (email) =>
      `Vous utilisez le compte ${email}. Ce compte deviendra administrateur : il décidera qui peut créer un compte et comment les e-mails sont envoyés.`,
    checkSender: "Vérifiez l’adresse d’envoi des e-mails de ce site.",
    organizationName: "Nom de l’organisation",
    organizationNameHelper:
      "Affiché dans l’en-tête et dans chaque e-mail envoyé par ce site.",
    organizationNamePlaceholder: "Acme SAS",
    supportEmail: "E-mail d’assistance",
    supportEmailHelper:
      "Les signataires et les utilisateurs sont invités à écrire à cette adresse pour obtenir de l’aide, et les réponses aux e-mails de ce site y arrivent. Vous pourrez la modifier dans les paramètres.",
    supportEmailPlaceholder: "aide@acmecorp.com",
    yourName: "Votre nom",
    yourEmail: "Votre e-mail",
    passwordHelper:
      "De 15 à 128 caractères. Laissez votre gestionnaire de mots de passe en générer un.",
    setupToken: "Jeton d’installation",
    setupTokenHelper:
      "La valeur de la variable d’environnement SETUP_TOKEN de ce déploiement.",
    submitting: "Installation…",
    finish: "Terminer l’installation",
    become: "Devenir administrateur",
    notRightAccount: "Ce n’est pas le bon compte ?",
    logInAsSomeoneElse: "Se connecter avec un autre compte",
    senderLegend: "Adresse d’envoi des e-mails",
    senderIntro:
      "Facultatif. Les e-mails sont envoyés via Resend depuis un domaine appartenant à votre organisation. Laissez le domaine vide pour décider plus tard dans les paramètres.",
    senderDomain: "Votre domaine",
    senderDomainIntegration:
      "Le domaine configuré par l’intégration Resend sur Vercel.",
    senderDomainGuess:
      "Déduit de l’adresse de ce site et des e-mails ci-dessus. Modifiez-le si votre organisation utilise un autre domaine.",
    senderDomainDefault:
      "Le domaine utilisé par la messagerie de votre organisation, par exemple acmecorp.com.",
    senderSubdomain: "Sous-domaine",
    senderSubdomainPlaceholder: "aucun",
    theDomain: "le domaine",
    senderSubdomainRecommended: (from, root) =>
      `Recommandé. Les e-mails partent de ${from} : leurs enregistrements DNS et leur réputation d’envoi restent ainsi séparés de votre messagerie habituelle. Videz ce champ pour envoyer directement depuis ${root}.`,
    senderSubdomainNone: (root, example) =>
      `Les e-mails partiront directement de ${root}. Un sous-domaine comme ${example} les sépare de votre messagerie habituelle.`,
    senderAddress: "Adresse",
    senderAddressHelper:
      "Personne n’a besoin de consulter cette boîte : les réponses arrivent à l’e-mail d’assistance.",
    senderPreviewBefore: "Les e-mails partiront de",
    senderPreviewAfter: (sendingDomain) =>
      `. Si Resend est connecté, l’installation y ajoute ${sendingDomain}, et l’écran suivant liste les enregistrements DNS à créer chez le gestionnaire de votre domaine.`,
  },

  signerPrivacy: {
    title: "Informations sur la confidentialité pour les signataires",
    metaDescription:
      "Comment vos informations sont utilisées lorsque vous signez un document ici.",
    lastUpdated: "13 novembre 2026",
    organizationFallback: "L’organisation qui exploite ce site",
    description: (organization) =>
      `${organization} utilise ce site pour envoyer des documents à signer électroniquement. Cette notice indique quelles informations sont collectées à votre sujet lorsque vous signez, pourquoi, et quels sont vos droits.`,
    retentionDays: (days) =>
      `Les documents finalisés et leur journal d’audit sont supprimés ${days} jours après leur finalisation.`,
    retentionKept:
      "Les documents finalisés et leur journal d’audit sont conservés jusqu’à leur suppression par l’organisation, car ils constituent la preuve d’un accord et beaucoup doivent être conservés plusieurs années en vertu de la loi.",
    responsibleHeading: "Responsable du traitement",
    responsible: (organization) =>
      `${organization} est responsable de vos informations (le « responsable du traitement »).`,
    contactAt: "Vous pouvez le contacter à l’adresse",
    contactThroughSender:
      "Vous pouvez le contacter par l’intermédiaire de la personne qui vous a envoyé le document.",
    collectedHeading: "Données collectées",
    collectedIdentity: "Vos nom et adresse e-mail, fournis par l’expéditeur.",
    collectedInput:
      "Ce que vous saisissez : votre signature ou vos initiales (tapées ou dessinées), des dates, du texte et des cases à cocher, ou le motif de votre refus.",
    collectedEvidence:
      "Les preuves de signature : le moment où vous avez ouvert, accepté et signé, votre adresse IP, la description que votre navigateur donne de lui-même, et les vérifications que vous avez passées (comme un code envoyé par e-mail).",
    collectedEmails:
      "L’historique des e-mails qui vous ont été envoyés au sujet du document.",
    basisHeading: "Finalités et base légale",
    basis:
      "Vous permettre de consulter et de signer le document, vous en remettre des copies, et conserver la preuve de qui a signé quoi et quand. La base légale est l’exécution d’un contrat auquel vous êtes partie ou de mesures précontractuelles (article 6, paragraphe 1, point b, du RGPD), l’intérêt légitime de l’organisation à pouvoir prouver l’accord (article 6, paragraphe 1, point f) et toute obligation légale de conservation (article 6, paragraphe 1, point c).",
    recipientsHeading: "Destinataires",
    recipients: (organization) =>
      `Les autres parties au document voient votre nom, votre e-mail et votre signature. Les services qui font fonctionner ce site traitent ces informations pour le compte de ${organization} : l’hébergeur (Vercel), le fournisseur de base de données (par exemple Neon), le stockage de fichiers (Vercel Blob) et le fournisseur d’e-mails (Resend). Certains sont établis aux États-Unis ; lorsque des informations quittent l’Espace économique européen, elles sont protégées par le cadre de protection des données UE-États-Unis (Data Privacy Framework) ou par des clauses contractuelles types.`,
    retentionHeading: "Durée de conservation",
    draftRetention: (days) =>
      `Les brouillons non envoyés sont supprimés après ${days} jours sans modification.`,
    rightsHeading: "Vos droits",
    rights: (organization) =>
      `Vous pouvez demander à ${organization} une copie de vos informations, leur rectification, la limitation de leur traitement ou vous y opposer, ou encore leur effacement. Un document signé peut être conservé malgré une demande d’effacement tant qu’il est nécessaire comme preuve ou au titre d’une obligation légale (article 17, paragraphe 3, du RGPD). Vous pouvez également introduire une réclamation auprès de l’autorité de protection des données de votre lieu de résidence ou de travail.`,
  },
};

const dictionaries: Record<Locale, AppMessages> = { en, fr };

/** The app's messages in the given language. */
export function appMessages(locale: Locale): AppMessages {
  return dictionaries[locale];
}
