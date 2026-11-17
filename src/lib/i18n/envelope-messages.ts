// What the sender's side of the app says: the dashboard, the steps that
// prepare and send an envelope, its detail page, templates, and the public
// verify and expired-download pages. English is written first; every other
// dictionary has its type, so the compiler lists any message it is missing.
//
// Errors the server sends back arrive already worded, and labels the server
// builds (dates on the detail page, status lines) are not repeated here.

import type { FieldType, SignatureMeaning } from "../types/domain.ts";
import type { Locale } from "./locales.ts";

type EnvelopeStatus = "completed" | "declined" | "draft" | "sent" | "voided";
type SignerStatus = "declined" | "pending" | "signed" | "waiting";
type DashboardFilterKey =
  "All" | "Completed" | "Declined" | "Draft" | "Sent" | "Voided";
type SignatureLevel = "advanced" | "qualified" | "simple";
type ResizeCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";
type ChoiceProblemKind = "dropdown_options" | "radio_group_size";

/** Who a signer was and is, read from a signer_corrected audit event. */
export type SignerCorrection = {
  email: string | null;
  name: string | null;
  previousEmail: string | null;
  previousName: string | null;
};

function englishReminderInterval(intervalDays: number | null): string {
  if (intervalDays === null) {
    return "Off";
  }

  if (intervalDays === 1) {
    return "Every day";
  }

  return intervalDays === 7
    ? "Every week"
    : `Every ${String(intervalDays)} days`;
}

function frenchReminderInterval(intervalDays: number | null): string {
  if (intervalDays === null) {
    return "Désactivées";
  }

  if (intervalDays === 1) {
    return "Tous les jours";
  }

  return intervalDays === 7
    ? "Toutes les semaines"
    : `Tous les ${String(intervalDays)} jours`;
}

/** French counts 0 and 1 in the singular. */
function frPlural(count: number, one: string, many: string): string {
  return count <= 1 ? one : many;
}

const en = {
  common: {
    back: "← Back",
    cancel: "Cancel",
    delete: "Delete",
    emailLabel: "Email",
    emailPlaceholder: "jane@company.com",
    genericError: "Something went wrong. Please try again.",
    invalidEmail: "Enter a valid email address",
    maximumReached: "Maximum reached",
    nameLabel: "Name",
    namePlaceholder: "Jane Smith",
    nameRequired: "Name is required",
    next: "Next →",
    optional: "(optional)",
    remove: "Remove",
    retry: "Retry",
    saving: "Saving...",
    sending: "Sending...",
    duplicateSignerEmail: "Each signer must have a unique email address.",
    duplicateCopyRecipientEmail:
      "This address is already a signer or a copy recipient.",
  },

  /** The four steps of a new envelope, and the header above them. */
  steps: {
    names: ["Upload", "Signers", "Place fields", "Review"],
    newEnvelope: "New envelope",
    upload: "Step 1 of 4 - Upload document",
    signers: "Step 2 of 4 - Add signers",
    prepare: "Step 3 of 4",
    review: "Step 4 of 4 - Review and send",
  },

  /** How long between automatic reminders, as offered in a menu. */
  reminderInterval: englishReminderInterval,

  upload: {
    startFromTemplate: "Start from a template",
    titleLabel: "Envelope title",
    titlePlaceholder: "e.g., NDA - Client Bravo",
    dropzoneLabel: "Document upload dropzone",
    progressLabel: "Upload progress",
    uploading: "Uploading...",
    validating: "Validating the PDF before you continue to signer setup.",
    dragAndDrop: "Drag and drop your PDF here",
    or: "or",
    clickToBrowse: "click to browse",
    limits: "PDF only - 20 MB max",
    next: "Next ->",
    fileInputLabel: "Upload PDF",
    invalidType: "Only PDF files are supported. Please upload a valid PDF.",
    previewUnavailable:
      "We couldn't render this PDF in the editor. Please export it as a standard PDF and try again.",
    tooLarge: "This file exceeds the 20 MB limit.",
    fileSize: (sizeInBytes: number) => {
      const sizeInMegabytes = sizeInBytes / (1024 * 1024);

      if (sizeInMegabytes >= 1) {
        return `${sizeInMegabytes.toFixed(1)} MB`;
      }

      return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
    },
  },

  signers: {
    checkChoices: {
      none: "No extra check",
      email_code: "Email them a one-time code when they open the link",
      access_code: "Ask for an access code you give them yourself",
    },
    accessCodeRequired: "Type the code you will give them",
    accessCodeLength: "Use 4 to 64 characters",
    routeFirst: "Receives the invitation immediately after send.",
    routeAfter: (previous: number) =>
      `Receives the document after Signer ${previous} finishes.`,
    signerPill: (order: number) => `Signer ${order}`,
    moveEarlierLabel: (order: number) => `Move signer ${order} earlier`,
    moveLaterLabel: (order: number) => `Move signer ${order} later`,
    removeLabel: (order: number) => `Remove signer ${order}`,
    earlier: "Earlier",
    later: "Later",
    nameAria: (order: number) => `Signer ${order} name`,
    emailAria: (order: number) => `Signer ${order} email`,
    meaningHeading: "What this signature means",
    meaningHelp:
      "Part 11 mode is on. The meaning is printed beside the signature with the signer's name and the time. The signer needs an account here with a confirmed email address, and an administrator must have confirmed who they are.",
    meaningAria: (order: number) => `Signer ${order} signature meaning`,
    chooseMeaning: "Choose a meaning",
    meanings: {
      approval: { label: "Approval", statement: "I approve this document." },
      authorship: {
        label: "Authorship",
        statement: "I am the author of this document.",
      },
      responsibility: {
        label: "Responsibility",
        statement: "I take responsibility for this document.",
      },
      review: {
        label: "Review",
        statement: "I have reviewed this document.",
      },
    } satisfies Record<SignatureMeaning, { label: string; statement: string }>,
    extraCheck: "Extra check before signing",
    extraCheckHelp:
      "By default anyone holding the emailed link can sign. Pick a check when the signer's identity matters.",
    bothChecks:
      "This signer has both an emailed code and an access code, so they must pass both. Picking one option below removes the other.",
    checkAria: (order: number, label: string) =>
      `Signer ${order} check: ${label}`,
    accessCodeLabel:
      "Access code you will give them yourself, for example by phone",
    accessCodeSet: " (a code is set; type a new one to change it)",
    accessCodeAria: (order: number) => `Signer ${order} access code`,
    accessCodePlaceholder: "At least 4 characters",
    copyPill: (position: number) => `Copy ${position}`,
    removeCopyLabel: (position: number) => `Remove copy recipient ${position}`,
    copyNameAria: (position: number) => `Copy recipient ${position} name`,
    copyEmailAria: (position: number) => `Copy recipient ${position} email`,
    copyNamePlaceholder: "Alex Jones",
    copyEmailPlaceholder: "alex@company.com",
    loadErrorTitle: "Couldn't load signer setup",
    loadErrorDescription:
      "We couldn't load this draft's signer list. Try again and confirm the upload step completed successfully.",
    heading: "Signers will receive the document in this order.",
    limit: "Up to 10 signers per document.",
    addSigner: "+ Add another signer",
    copyHeading: "Send a copy to",
    copyHelp:
      "These people do not sign. They receive the finished document and its certificate once everyone has signed.",
    addCopy: "+ Add a copy recipient",
  },

  prepare: {
    back: "Back",
    quotedTitle: (title: string) => `"${title}"`,
    fallbackTitle: "Document",
    loadErrorTitle: "Couldn't load this document",
    fieldTypes: {
      signature: { label: "Signature", placeholder: "Sign" },
      initials: { label: "Initials", placeholder: "Initials" },
      date: { label: "Date", placeholder: "Date" },
      text: { label: "Text", placeholder: "Text" },
      checkbox: { label: "Checkbox", placeholder: "Checkbox" },
      number: { label: "Number", placeholder: "Number" },
      dropdown: { label: "Dropdown", placeholder: "Dropdown" },
      radio: { label: "Radio button", placeholder: "Radio button" },
    } satisfies Record<FieldType, { label: string; placeholder: string }>,
    fields: "Fields",
    signers: "Signers",
    fieldsPlaced: (count: number) =>
      count === 1 ? "1 field placed" : `${String(count)} fields placed`,
    previousPage: "Previous page",
    nextPage: "Next page",
    documentPage: "Document page",
    pageOf: (page: number, pageCount: number) => `Page ${page} of ${pageCount}`,
    selectedSigner: "Selected signer",
    openFieldTools: "Open field tools",
    placeOnPage: (label: string, page: number) =>
      `Place ${label} on page ${page}`,
    placeOnDocument: (label: string) => `Place ${label} on the document page`,
    noFieldsTitle: "No fields placed yet",
    noFieldsHelp:
      "Pick a field, then click the page to place it for the selected signer.",
    radioLabel: (label: string) => `Radio button: ${label}`,
    readyToPlace: "Ready to place",
    clickToPlace: "Click the page to place",
    clickToPlaceFor: "for",
    clickToPlaceEnd: ".",
    inspector: "Inspector",
    closeFieldTools: "Close field tools",
    fieldTools: "Field tools",
    done: "Done",
    placing: "Placing",
    place: "Place",
    signatureReady: "Signature ready",
    signatureNeeded: "Signature needed",
    toolReady: (label: string) => `${label} ready to place`,
    noFieldSelected: "No field selected",
    clickDocumentToPlace: (label: string, signerName: string) =>
      `Click the document to place ${label.toLowerCase()} for ${signerName}.`,
    selectFieldHelp:
      "Select a field on the page to edit its settings, or choose a field tool on the left to place a new one.",
    placingTool: (label: string) => `Placing ${label.toLowerCase()}`,
    newFieldsAssigned: "New fields will be assigned here",
    saveFailed: "Save failed",
    saved: "Saved",
    fieldSettings: "Field settings",
    assignedTo: "Assigned to",
    choices: "Choices",
    choicesPlaceholder: "Yes\nNo\nNot sure",
    choicesNeedTwo: "One choice per line. Add at least two.",
    choicesCount: (count: number, max: number) =>
      `One choice per line. ${String(count)} of up to ${String(max)}. The signer picks one.`,
    radioMeaning: "What this button means",
    radioPlaceholder: "Yes",
    radioNeedsMore: "A radio button needs at least one more in its group.",
    radioGroupSize: (count: number) =>
      `${String(count)} buttons in this group. The signer picks one.`,
    addRadioButton: "+ Add a button to this group",
    requiredWholeGroup: "Required (whole group)",
    required: "Required",
    optional: "Optional",
    aSigner: "a signer",
    choiceProblem: (kind: ChoiceProblemKind, signerName: string) =>
      kind === "dropdown_options"
        ? `A dropdown for ${signerName} needs at least two choices. Select it and add them.`
        : `A radio button for ${signerName} is on its own. Add another button to its group, or remove it.`,
    resizeLabel: (label: string, corner: ResizeCorner) =>
      `Resize ${label} field from ${corner}`,
    canvas: {
      errorHint: "Reload the page or try this draft again in a moment.",
      errorTitle: "We couldn't render this PDF page.",
      loadingHint:
        "Preparing the source PDF so placed fields stay aligned with the stored page size.",
      loadingTitle: "Rendering document page...",
      pageLabel: (pageNumber: number) => `Rendered PDF page ${pageNumber}`,
    },
  },

  review: {
    signatureLevel: (level: SignatureLevel, providerName: string) => {
      switch (level) {
        case "advanced":
          return `Advanced electronic signatures through ${providerName}`;
        case "qualified":
          return `Qualified electronic signatures through ${providerName}`;
        default:
          return "SignuDoc signatures";
      }
    },
    success: (signerName: string) =>
      `Envelope sent. ${signerName} has been notified.`,
    sendError: "Failed to send. Please try again.",
    firstSignerFallback: "Signer 1",
    loadErrorTitle: "Couldn't load the review summary",
    loadErrorDescription:
      "We couldn't load this draft summary. Try again after checking the earlier steps.",
    backToPrepare: "Back to prepare",
    emptyDescription:
      "Add signers and place fields before you review the final summary for this envelope.",
    emptyEyebrow: "Incomplete draft",
    emptyTitle: "Nothing to review yet",
    opening: "Opening the envelope detail view...",
    document: "Document",
    fileLine: (filename: string, pageCount: number, sizeLabel: string) =>
      `${filename} - ${pageCount} pages - ${sizeLabel}`,
    signingOrder: "Signing order",
    signerCount: (count: number) =>
      `${count} ${count === 1 ? "signer" : "signers"}`,
    signerPill: (order: number) => `Signer ${order}`,
    copiesHeading: "Copies when everyone has signed",
    afterSend:
      "After you send, Signer 1 will receive an email with a link to sign. Each signer is notified in order after the previous signer completes.",
    deadlineLabel: "Signing deadline",
    days: (days: number) => `${days} days`,
    remindersLabel: "Automatic reminders",
    deadlineHelp:
      "Signing links stop working at the deadline. Reminders go to the signer whose turn it is until they sign. You can change both later from the envelope.",
    signatureTypeLabel: "Signature type",
    simpleHelp:
      "Signers sign here, and the finished PDF is sealed by this install.",
    providerHelp: (providerName: string, qualified: boolean) =>
      `Each signer proves who they are at ${providerName} and signs with a certificate in their own name. ${qualified ? "A qualified signature needs a qualified certificate, which not every signer has. " : ""}Which type a document needs is a legal question; this is not legal advice.`,
    send: "Send envelope",
    dialogTitle: "Send this envelope?",
    dialogBody: (
      title: string,
      signerCount: number,
      firstSignerName: string,
      deadlineDays: number,
    ) =>
      `"${title}" will be sent to ${signerCount} ${signerCount === 1 ? "signer" : "signers"}. ${
        signerCount === 1
          ? `${firstSignerName} will be notified immediately.`
          : `The first signer (${firstSignerName}) will be notified immediately.`
      } The request expires in ${deadlineDays} days.`,
    signatureTypeNote: (signatureType: string) =>
      `Signature type: ${signatureType}. It cannot be changed once the envelope is sent.`,
    permittedUsePrefix:
      "By sending, you confirm this document is an ordinary business agreement and not a will, court order, legally required consumer disclosure, or other",
    permittedUseLink: "document that cannot be signed electronically",
    permittedUseSuffix: ".",
    sendNow: "Send now",
    fieldSummary: (fieldCount: number) =>
      fieldCount === 0
        ? "No fields placed yet (0 fields)"
        : `(${fieldCount} field${fieldCount === 1 ? "" : "s"})`,
  },

  detail: {
    loadErrorTitle: "Couldn't load this envelope",
    loadErrorDescription: "Couldn't load this envelope. Please try again.",
    backToDocuments: "Back to documents",
    notFoundDescription:
      "We couldn't find this envelope, or you no longer have access to it.",
    notFoundEyebrow: "Unavailable",
    notFoundTitle: "This envelope is unavailable",
    reminderHelper: (label: string) =>
      `You can send another reminder after ${label}.`,
    deadlineExpired: (label: string | null) =>
      `Expired ${label}. Nobody can sign until you set a new deadline.`,
    deadlineExpires: (label: string) => `Expires ${label}.`,
    noDeadline: "No deadline. Each signing link lasts seven days.",
    remindersOff: "Automatic reminders are off.",
    remindersOn: (intervalDays: number) =>
      `Automatic reminders: ${englishReminderInterval(intervalDays).toLowerCase()}.`,
    reminderError: "Unable to send a reminder right now.",
    deadlineError: "Unable to change the deadline.",
    correctError: "Unable to correct this signer.",
    remindersError: "Unable to change the reminders.",
    copyError: "Unable to copy this envelope.",
    deleteError: "Unable to delete this draft.",
    voidError: "Unable to void this envelope.",
    documentsLink: "← Documents",
    statusLabels: {
      completed: "Completed",
      declined: "Declined",
      draft: "Draft",
      sent: "Sent",
      voided: "Voided",
    } satisfies Record<EnvelopeStatus, string>,
    expired: "Expired",
    signerStatusLabels: {
      declined: "Declined",
      pending: "Pending",
      signed: "Signed",
      waiting: "Waiting",
    } satisfies Record<SignerStatus, string>,
    created: (label: string) => `Created ${label}`,
    deleteDraft: "Delete draft",
    continueEditing: "Continue editing",
    voidEnvelope: "Void envelope",
    sendReminder: "Send reminder",
    downloadCertificate: "Download certificate",
    downloadSigned: "Download signed PDF",
    copyToDraft: "Copy to new draft",
    exportAudit: "Export audit trail",
    setNewDeadline: "Set a new deadline",
    changeDeadline: "Change deadline",
    changeReminders: "Change reminders",
    savedAsTemplate: (name: string) => `Saved as the template “${name}”.`,
    viewTemplates: "View templates",
    templatePrompt:
      "Send this kind of document often? Keep its fields and signing order as a template.",
    saveAsTemplate: "Save as template",
    signers: "Signers",
    total: (count: number) => `${count} total`,
    change: "Change",
    receivesCopy: "Receives a copy",
    copySent: "Sent the finished document and its certificate.",
    copyPending: "Gets the finished document once everyone has signed.",
    timeline: "Timeline",
    events: (count: number) => `${count} events`,
    deleteDialog: {
      title: "Delete this draft?",
      lines: [
        "This draft has not been sent yet.",
        "Deleting it will permanently remove the draft and its placed fields.",
      ],
    },
    voidDialog: {
      title: "Void this envelope?",
      lines: [
        "This will cancel the signing process.",
        "Notified signers will be informed that the envelope has been voided.",
        "This action cannot be undone.",
      ],
      reasonRequired: "Reason (required)",
      reasonOptional: "Reason (optional)",
      reasonHelp: "Kept in the envelope's audit trail.",
    },
    copyDialog: {
      title: "Copy to a new draft",
      lines: [
        "This starts a new draft with the same document, the same people and the same fields. Nothing that was filled in is copied.",
        "Access codes are not copied: they are stored hashed, so they cannot be brought across. You can set new ones before sending.",
        "Nobody is emailed, and this envelope is left as it is.",
      ],
      copying: "Copying...",
    },
    deadlineDialog: {
      titleExpired: "Set a new deadline",
      title: "Change the deadline",
      countsFromNow: "The new deadline counts from now.",
      linkWorksAgain: "The signing link that was already sent will work again.",
      linkKeepsWorking:
        "The signing link that was already sent keeps working until then.",
      label: "Signing deadline",
      daysFromNow: (days: number) => `${days} days from now`,
      save: "Save deadline",
    },
    remindersDialog: {
      title: "Automatic reminders",
      help: "A reminder goes to the signer whose turn it is when they have not heard from you for this long. Reminders stop once everyone has signed or the deadline passes.",
      label: "Send a reminder",
      save: "Save reminders",
    },
    correctDialog: {
      title: "Correct this signer",
      help: "The signing link already sent to this person will stop working. If it is their turn, a new invitation goes to the corrected address.",
      save: "Save",
    },
  },

  templates: {
    title: "Templates",
    description:
      "Documents you send often, with their fields and signing order already in place.",
    loadErrorDescription:
      "We couldn't load your templates. Try again in a moment.",
    loadErrorTitle: "Couldn't load templates",
    emptyTitle: "No templates yet",
    emptyHelp:
      "Open any document you have prepared or sent and choose Save as template. Next time, you only name the people who sign.",
    goToDocuments: "Go to documents",
    saved: (label: string) => `Saved ${label}`,
    signersLabel: (name: string) => `Signers in ${name}`,
    deleteLabel: (name: string) => `Delete the template ${name}`,
    use: "Use template",
    deleteError: "Unable to delete this template.",
    deleteTitle: "Delete this template?",
    deleteRemoved: (name: string) => `“${name}” will be removed for good.`,
    deleteNotAffected: "Documents you already made from it are not affected.",
    deleting: "Deleting...",
    deleteConfirm: "Delete template",
  },

  saveTemplate: {
    title: "Save as a template",
    intro:
      "A template keeps this document, where its fields are and the order people sign in. It does not keep anyone's name or email address, or anything that was filled in.",
    nameLabel: "Template name",
    whoSigns: "Who signs",
    whoSignsHelp:
      "Name each place in the signing order, such as Client or Landlord. You say who that is each time you use the template.",
    defaultRoleName: (order: number) => `Signer ${order}`,
    roleLabel: (order: number, signerName: string) =>
      `Signer ${order}, here ${signerName}`,
    repeatedName: "Give each signer a different name.",
    save: "Save template",
  },

  useTemplate: {
    title: "Use a template",
    backToTemplates: "Back to templates",
    loadError: "We couldn't load this template. Try again in a moment.",
    cannotUse: "This template can't be used",
    titleRequired: "Give the envelope a title",
    envelopeTitle: "Envelope title",
    whoHeading: "Who is signing this time?",
    whoHelp:
      "They receive the document in this order. The fields are already placed for each of them.",
    nameAria: (roleName: string) => `${roleName} name`,
    emailAria: (roleName: string) => `${roleName} email`,
    nothingSent:
      "Nothing is sent yet. You will see the review step next, where you can still change the fields, add people who get a copy, or add an extra check before signing.",
    creating: "Creating...",
    create: "Create draft",
  },

  dashboard: {
    title: "Documents",
    description:
      "Track drafts, sent envelopes, and completed agreements in one place.",
    newEnvelope: "New envelope",
    filters: {
      All: "All",
      Completed: "Completed",
      Declined: "Declined",
      Draft: "Draft",
      Sent: "Sent",
      Voided: "Voided",
    } satisfies Record<DashboardFilterKey, string>,
    filterLabel: "Filter documents",
    search: "Search by title or email...",
    showing: (shown: number, total: number) =>
      `Showing ${shown} of ${total} envelopes`,
    loadError: "We couldn't load your documents. Please try again.",
    retry: "Retry",
    statusLabel: (label: string) => `Status: ${label}`,
    statusLabels: {
      completed: "Completed",
      declined: "Declined",
      draft: "Draft",
      sent: "Sent",
      voided: "Voided",
    } satisfies Record<EnvelopeStatus, string>,
    expired: "Expired",
    createdPrefix: "Created ",
    uploadPdf: "Upload a PDF",
    noResultsTitle: "No documents match your search",
    noResultsHelp: "Try a different title, signer email, or status filter.",
    resetFilters: "Reset filters",
    emptyTitle: "No documents yet",
    emptyHelp: "Upload a PDF and send it for signatures in minutes.",
  },

  verify: {
    metaDescription:
      "Check that a signed PDF or audit certificate is exactly the file this site produced.",
    title: "Verify a document",
    description:
      "Check that a signed PDF or audit certificate is exactly the file this site produced when signing finished. Any change to the file, however small, gives a different fingerprint.",
    sealHeading: "Checking the seal in a PDF reader",
    sealBody:
      "Finished documents and certificates also carry a digital seal. Open the file in Adobe Acrobat Reader or another PDF reader and look at its signature panel. The reader says whether the document has been changed since it was sealed. Unless the organization has installed a certificate from a certificate authority, the reader will also say the signer's identity is unknown; that is expected and does not affect the check for changes.",
    couldNotCheck: "The file could not be checked right now.",
    couldNotRead: "The file could not be read.",
    choose: "Choose a signed PDF or audit certificate",
    staysOnDevice:
      "The file stays on your device. Only its SHA-256 fingerprint is sent.",
    inputLabel: "PDF to verify",
    checking: (fileName: string | null) => `Checking ${fileName ?? ""}...`,
    unchanged: (kind: "certificate" | "signed-document", title: string) =>
      `This file is unchanged. It is the ${
        kind === "signed-document" ? "signed document" : "audit certificate"
      } this site produced for “${title}”.`,
    details: (
      status: "completed" | "declined" | "voided",
      finishedAt: string | null,
      signerCount: number,
      envelopeId: string,
    ) =>
      `The envelope was ${status}${finishedAt ? ` on ${finishedAt} UTC` : ""} with ${signerCount} signer${signerCount === 1 ? "" : "s"}. Envelope ID ${envelopeId}.`,
    noMatch: "No match.",
    noMatchHelp:
      "This site did not produce this exact file. It may have been changed, saved again by another program, or come from somewhere else. Ask the sender for the copy kept on this site.",
  },

  download: {
    metaTitle: "Download link expired",
    title: "This download link has expired",
    description:
      "Download links work for a limited time. You can have new ones sent to the email address this document was sent to.",
    couldNotSend: "New links could not be sent right now.",
    sent: (maskedEmail: string) =>
      `New links are on their way to ${maskedEmail}.`,
    button: "Email me new download links",
  },

  /**
   * Labels the server builds for the dashboard, the envelope detail page,
   * the review step and the templates list. Dates arrive already formatted
   * in the install's language.
   */
  labels: {
    sentTo: (emails: string) => `Sent to: ${emails || "—"}`,
    expiredWaitingOn: (date: string, email: string) =>
      `Expired ${date} · was waiting on: ${email}`,
    waitingOn: (email: string) => `Waiting on: ${email}`,
    declinedBy: (email: string) => `Declined by: ${email}`,
    voidedOn: (date: string) => `Voided on ${date}`,
    draftSummary: (signerCount: number, fieldCount: number) =>
      `${signerCount} ${signerCount === 1 ? "signer" : "signers"} · ${fieldCount} ${fieldCount === 1 ? "field" : "fields"} placed`,
    expired: "Expired",
    signedOf: (signedCount: number, signerCount: number) =>
      `${String(signedCount)} of ${String(signerCount)} signed`,
    statuses: {
      completed: "Completed",
      declined: "Declined",
      draft: "Draft",
      sent: "Sent",
      voided: "Voided",
    } satisfies Record<EnvelopeStatus, string>,
    signerSigned: (date: string) => `Signed ${date}`,
    signerDeclined: (date: string) => `Declined ${date}`,
    signerNotified: (date: string) => `Notified ${date}`,
    signerNotifiedBeforeVoid: "Notified before void",
    signerSent: (date: string) => `Sent ${date}`,
    readyAfter: (previousSignerName: string) =>
      `Ready to notify after ${previousSignerName}`,
    readyAfterSend: "Ready to notify after send",
    noNotification: "No notification sent",
    lastNotifiedBeforeVoid: "Last notified signer before void",
    declineReason: (reason: string) => `Decline reason: ${reason}`,
    skippedAfterDecline: "Skipped after decline",
    notReachedBeforeVoid: "Not reached before void",
    fieldsCompleted: (count: number) =>
      `${count} ${count === 1 ? "field" : "fields"} completed`,
    currentSigner: "Current signer",
    fieldsAssigned: (count: number) =>
      `${count} ${count === 1 ? "field" : "fields"} assigned`,
    signatureType: (level: "advanced" | "qualified", provider: string | null) =>
      `${level === "advanced" ? "Advanced" : "Qualified"} electronic signatures${provider ? ` through ${provider}` : ""}`,
    fileSize: (sizeBytes: number) =>
      sizeBytes < 1024 * 1024
        ? `${(sizeBytes / 1024).toFixed(1)} KB`
        : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
    pageCount: (count: number) =>
      `${String(count)} ${count === 1 ? "page" : "pages"}`,
    fieldCount: (count: number) =>
      `${String(count)} ${count === 1 ? "field" : "fields"}`,
    timeline: {
      someoneSigner: "signer",
      copied: "Copied from an earlier envelope",
      created: "Envelope created",
      sent: (target: string) => `Sent to ${target}`,
      viewed: (target: string) => `Viewed by ${target}`,
      signedPart11: (target: string, meaning: string) =>
        `Signed by ${target} (${meaning}, password given again)`,
      signedWithProvider: (
        target: string,
        level: "advanced" | "qualified",
        provider: string | null,
      ) =>
        `Signed by ${target} with ${level === "advanced" ? "an advanced" : "a qualified"} electronic signature${provider ? ` through ${provider}` : ""}`,
      signed: (target: string) => `Signed by ${target}`,
      declined: (target: string, reason: string | null) =>
        reason ? `Declined by ${target} — ${reason}` : `Declined by ${target}`,
      remindedManual: (target: string) => `Manual reminder sent to ${target}`,
      remindedAuto: (target: string) => `Automatic reminder sent to ${target}`,
      consented: (target: string) =>
        `${target} agreed to use electronic records and signatures`,
      verified: (target: string) => `${target} confirmed their identity`,
      verificationFailed: (target: string) =>
        `Wrong identity code entered for ${target}`,
      emailSent: (recipient: string | null) =>
        recipient
          ? `Email accepted for delivery to ${recipient}`
          : "Email accepted for delivery",
      completed: "Final signed PDF and certificate generated",
      voided: (reason: string | null) =>
        reason
          ? `Envelope voided by sender — ${reason}`
          : "Envelope voided by sender",
      reauthenticationFailed: (target: string) =>
        `Wrong password given while signing for ${target}`,
      deadlineChanged: (deadline: string | null) =>
        deadline ? `Deadline set to ${deadline}` : "Deadline changed",
      expired: "Deadline passed before everyone signed",
      /**
       * A corrected signer. The detail page words English with the audit
       * trail's own describeSignerCorrectedEvent (services/audit.ts), which
       * this repeats for completeness; the other languages use this.
       */
      signerCorrected: ({
        email,
        name,
        previousEmail,
        previousName,
      }: SignerCorrection) => {
        const person = (
          personName: string | null,
          personEmail: string | null,
        ) =>
          personName && personEmail
            ? `${personName} <${personEmail}>`
            : (personName ?? personEmail ?? "signer");
        const sameName =
          previousName !== null && name !== null && previousName === name;
        const sameEmail =
          previousEmail !== null &&
          email !== null &&
          previousEmail.toLowerCase() === email.toLowerCase();

        if (sameName && previousEmail && email) {
          return `Signer email corrected from ${previousEmail} to ${email}`;
        }

        if (sameEmail && previousName && name) {
          return `Signer name corrected from ${previousName} to ${name}`;
        }

        if (!previousEmail && !email && previousName && name) {
          return previousName === name
            ? "Signer email was corrected"
            : `Signer name corrected from ${previousName} to ${name}`;
        }

        return `Signer corrected from ${person(previousName, previousEmail)} to ${person(name, email)}`;
      },
    },
  },

  /** The error and loading screens of the app and the field editor. */
  pages: {
    appErrorDescription:
      "Something went wrong while loading this page. Please try again.",
    appErrorTitle: "We couldn't load this page.",
    tryAgain: "Try again",
    canvasErrorDescription:
      "Something went wrong while opening this document. Please try again.",
    canvasErrorTitle: "We couldn't open this document.",
    reloadCanvas: "Reload canvas",
    loading: "Loading page",
  },
};

export type EnvelopeMessages = typeof en;

const frCornerNames: Record<ResizeCorner, string> = {
  "bottom-left": "le coin inférieur gauche",
  "bottom-right": "le coin inférieur droit",
  "top-left": "le coin supérieur gauche",
  "top-right": "le coin supérieur droit",
};

const fr: EnvelopeMessages = {
  common: {
    back: "← Retour",
    cancel: "Annuler",
    delete: "Supprimer",
    emailLabel: "E-mail",
    emailPlaceholder: "marie@entreprise.fr",
    genericError: "Une erreur s’est produite. Veuillez réessayer.",
    invalidEmail: "Saisissez une adresse e-mail valide",
    maximumReached: "Nombre maximal atteint",
    nameLabel: "Nom",
    namePlaceholder: "Marie Dupont",
    nameRequired: "Le nom est obligatoire",
    next: "Suivant →",
    optional: "(facultatif)",
    remove: "Retirer",
    retry: "Réessayer",
    saving: "Enregistrement…",
    sending: "Envoi…",
    duplicateSignerEmail:
      "Chaque signataire doit avoir une adresse e-mail différente.",
    duplicateCopyRecipientEmail:
      "Cette adresse est déjà celle d’un signataire ou d’un destinataire en copie.",
  },

  steps: {
    names: ["Importer", "Signataires", "Placer les champs", "Vérifier"],
    newEnvelope: "Nouvelle demande de signature",
    upload: "Étape 1 sur 4 - Importer le document",
    signers: "Étape 2 sur 4 - Ajouter les signataires",
    prepare: "Étape 3 sur 4",
    review: "Étape 4 sur 4 - Vérifier et envoyer",
  },

  reminderInterval: frenchReminderInterval,

  upload: {
    startFromTemplate: "Partir d’un modèle",
    titleLabel: "Titre de la demande",
    titlePlaceholder: "ex. : Accord de confidentialité - Client Bravo",
    dropzoneLabel: "Zone de dépôt du document",
    progressLabel: "Progression de l’import",
    uploading: "Import en cours…",
    validating:
      "Vérification du PDF avant de passer à l’ajout des signataires.",
    dragAndDrop: "Glissez-déposez votre PDF ici",
    or: "ou",
    clickToBrowse: "cliquez pour parcourir",
    limits: "PDF uniquement - 20 Mo max.",
    next: "Suivant →",
    fileInputLabel: "Importer un PDF",
    invalidType:
      "Seuls les fichiers PDF sont acceptés. Importez un PDF valide.",
    previewUnavailable:
      "Impossible d’afficher ce PDF dans l’éditeur. Exportez-le en PDF standard et réessayez.",
    tooLarge: "Ce fichier dépasse la limite de 20 Mo.",
    fileSize: (sizeInBytes) => {
      const sizeInMegabytes = sizeInBytes / (1024 * 1024);

      if (sizeInMegabytes >= 1) {
        return `${sizeInMegabytes.toFixed(1).replace(".", ",")} Mo`;
      }

      return `${Math.max(1, Math.round(sizeInBytes / 1024))} Ko`;
    },
  },

  signers: {
    checkChoices: {
      none: "Aucune vérification supplémentaire",
      email_code:
        "Lui envoyer un code à usage unique par e-mail à l’ouverture du lien",
      access_code:
        "Demander un code d’accès que vous lui transmettez vous-même",
    },
    accessCodeRequired: "Saisissez le code que vous lui transmettrez",
    accessCodeLength: "Utilisez entre 4 et 64 caractères",
    routeFirst: "Reçoit l’invitation dès l’envoi.",
    routeAfter: (previous) =>
      `Reçoit le document une fois que le signataire ${previous} a terminé.`,
    signerPill: (order) => `Signataire ${order}`,
    moveEarlierLabel: (order) => `Avancer le signataire ${order}`,
    moveLaterLabel: (order) => `Reculer le signataire ${order}`,
    removeLabel: (order) => `Retirer le signataire ${order}`,
    earlier: "Avant",
    later: "Après",
    nameAria: (order) => `Nom du signataire ${order}`,
    emailAria: (order) => `E-mail du signataire ${order}`,
    meaningHeading: "Portée de cette signature",
    meaningHelp:
      "Le mode Part 11 est activé. La portée est imprimée à côté de la signature, avec le nom du signataire et l’heure. Le signataire doit avoir un compte ici avec une adresse e-mail confirmée, et un administrateur doit avoir confirmé son identité.",
    meaningAria: (order) => `Portée de la signature du signataire ${order}`,
    chooseMeaning: "Choisissez une portée",
    meanings: {
      approval: {
        label: "Approbation",
        statement: "J’approuve ce document.",
      },
      authorship: {
        label: "Auteur",
        statement: "Je suis l’auteur de ce document.",
      },
      responsibility: {
        label: "Responsabilité",
        statement: "J’assume la responsabilité de ce document.",
      },
      review: {
        label: "Relecture",
        statement: "J’ai relu ce document.",
      },
    },
    extraCheck: "Vérification supplémentaire avant signature",
    extraCheckHelp:
      "Par défaut, toute personne disposant du lien reçu par e-mail peut signer. Choisissez une vérification lorsque l’identité du signataire compte.",
    bothChecks:
      "Ce signataire a à la fois un code par e-mail et un code d’accès : il doit donc fournir les deux. Choisir une option ci-dessous supprime l’autre.",
    checkAria: (order, label) =>
      `Vérification du signataire ${order} : ${label}`,
    accessCodeLabel:
      "Code d’accès que vous lui transmettrez vous-même, par exemple par téléphone",
    accessCodeSet:
      " (un code est défini ; saisissez-en un nouveau pour le modifier)",
    accessCodeAria: (order) => `Code d’accès du signataire ${order}`,
    accessCodePlaceholder: "Au moins 4 caractères",
    copyPill: (position) => `Copie ${position}`,
    removeCopyLabel: (position) =>
      `Retirer le destinataire en copie ${position}`,
    copyNameAria: (position) => `Nom du destinataire en copie ${position}`,
    copyEmailAria: (position) => `E-mail du destinataire en copie ${position}`,
    copyNamePlaceholder: "Alex Martin",
    copyEmailPlaceholder: "alex@entreprise.fr",
    loadErrorTitle: "Impossible de charger les signataires",
    loadErrorDescription:
      "Impossible de charger la liste des signataires de ce brouillon. Réessayez et vérifiez que l’import du document a bien abouti.",
    heading: "Les signataires recevront le document dans cet ordre.",
    limit: "Jusqu’à 10 signataires par document.",
    addSigner: "+ Ajouter un signataire",
    copyHeading: "Envoyer une copie à",
    copyHelp:
      "Ces personnes ne signent pas. Elles reçoivent le document finalisé et son certificat une fois que tout le monde a signé.",
    addCopy: "+ Ajouter un destinataire en copie",
  },

  prepare: {
    back: "Retour",
    quotedTitle: (title) => `« ${title} »`,
    fallbackTitle: "Document",
    loadErrorTitle: "Impossible de charger ce document",
    fieldTypes: {
      signature: { label: "Signature", placeholder: "Signer" },
      initials: { label: "Initiales", placeholder: "Initiales" },
      date: { label: "Date", placeholder: "Date" },
      text: { label: "Texte", placeholder: "Texte" },
      checkbox: { label: "Case à cocher", placeholder: "Case à cocher" },
      number: { label: "Nombre", placeholder: "Nombre" },
      dropdown: { label: "Liste déroulante", placeholder: "Liste déroulante" },
      radio: { label: "Bouton radio", placeholder: "Bouton radio" },
    },
    fields: "Champs",
    signers: "Signataires",
    fieldsPlaced: (count) =>
      `${String(count)} ${frPlural(count, "champ placé", "champs placés")}`,
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    documentPage: "Page du document",
    pageOf: (page, pageCount) => `Page ${page} sur ${pageCount}`,
    selectedSigner: "Signataire sélectionné",
    openFieldTools: "Ouvrir les outils de champ",
    placeOnPage: (label, page) =>
      `Placer le champ ${label} sur la page ${page}`,
    placeOnDocument: (label) =>
      `Placer le champ ${label} sur la page du document`,
    noFieldsTitle: "Aucun champ placé",
    noFieldsHelp:
      "Choisissez un champ, puis cliquez sur la page pour le placer pour le signataire sélectionné.",
    radioLabel: (label) => `Bouton radio : ${label}`,
    readyToPlace: "Prêt à placer",
    clickToPlace: "Cliquez sur la page pour placer le champ",
    clickToPlaceFor: "pour",
    clickToPlaceEnd: ".",
    inspector: "Propriétés",
    closeFieldTools: "Fermer les outils de champ",
    fieldTools: "Outils de champ",
    done: "Terminé",
    placing: "En cours",
    place: "Placer",
    signatureReady: "Signature placée",
    signatureNeeded: "Signature manquante",
    toolReady: (label) => `${label} : prêt à placer`,
    noFieldSelected: "Aucun champ sélectionné",
    clickDocumentToPlace: (label, signerName) =>
      `Cliquez sur le document pour placer le champ ${label.toLowerCase()} pour ${signerName}.`,
    selectFieldHelp:
      "Sélectionnez un champ sur la page pour modifier ses réglages, ou choisissez un outil de champ à gauche pour en placer un nouveau.",
    placingTool: (label) => `Placement : ${label.toLowerCase()}`,
    newFieldsAssigned: "Les nouveaux champs lui seront attribués",
    saveFailed: "Échec de l’enregistrement",
    saved: "Enregistré",
    fieldSettings: "Réglages du champ",
    assignedTo: "Attribué à",
    choices: "Choix",
    choicesPlaceholder: "Oui\nNon\nNe sais pas",
    choicesNeedTwo: "Un choix par ligne. Ajoutez-en au moins deux.",
    choicesCount: (count, max) =>
      `Un choix par ligne. ${String(count)} sur ${String(max)} au maximum. Le signataire en choisit un.`,
    radioMeaning: "Signification de ce bouton",
    radioPlaceholder: "Oui",
    radioNeedsMore:
      "Un bouton radio doit avoir au moins un autre bouton dans son groupe.",
    radioGroupSize: (count) =>
      `${String(count)} boutons dans ce groupe. Le signataire en choisit un.`,
    addRadioButton: "+ Ajouter un bouton à ce groupe",
    requiredWholeGroup: "Obligatoire (tout le groupe)",
    required: "Obligatoire",
    optional: "Facultatif",
    aSigner: "un signataire",
    choiceProblem: (kind, signerName) =>
      kind === "dropdown_options"
        ? `Une liste déroulante pour ${signerName} doit proposer au moins deux choix. Sélectionnez-la et ajoutez-les.`
        : `Un bouton radio pour ${signerName} est seul dans son groupe. Ajoutez-lui un autre bouton ou supprimez-le.`,
    resizeLabel: (label, corner) =>
      `Redimensionner le champ ${label} depuis ${frCornerNames[corner]}`,
    canvas: {
      errorHint: "Rechargez la page ou rouvrez ce brouillon dans un instant.",
      errorTitle: "Impossible d’afficher cette page du PDF.",
      loadingHint:
        "Préparation du PDF pour que les champs placés restent alignés sur la page.",
      loadingTitle: "Affichage de la page…",
      pageLabel: (pageNumber) => `Page ${pageNumber} du PDF`,
    },
  },

  review: {
    signatureLevel: (level, providerName) => {
      switch (level) {
        case "advanced":
          return `Signatures électroniques avancées via ${providerName}`;
        case "qualified":
          return `Signatures électroniques qualifiées via ${providerName}`;
        default:
          return "Signatures SignuDoc";
      }
    },
    success: (signerName) =>
      `Demande de signature envoyée. ${signerName} a été prévenu(e).`,
    sendError: "L’envoi a échoué. Veuillez réessayer.",
    firstSignerFallback: "Signataire 1",
    loadErrorTitle: "Impossible de charger le récapitulatif",
    loadErrorDescription:
      "Impossible de charger le récapitulatif de ce brouillon. Vérifiez les étapes précédentes, puis réessayez.",
    backToPrepare: "Retour à la préparation",
    emptyDescription:
      "Ajoutez des signataires et placez les champs avant de vérifier le récapitulatif de cette demande de signature.",
    emptyEyebrow: "Brouillon incomplet",
    emptyTitle: "Rien à vérifier pour l’instant",
    opening: "Ouverture du détail de la demande…",
    document: "Document",
    fileLine: (filename, pageCount, sizeLabel) =>
      `${filename} - ${pageCount} ${frPlural(pageCount, "page", "pages")} - ${sizeLabel}`,
    signingOrder: "Ordre de signature",
    signerCount: (count) =>
      `${count} ${frPlural(count, "signataire", "signataires")}`,
    signerPill: (order) => `Signataire ${order}`,
    copiesHeading: "Copies une fois que tout le monde a signé",
    afterSend:
      "Après l’envoi, le signataire 1 recevra un e-mail avec un lien pour signer. Chaque signataire est prévenu à son tour, une fois que le précédent a terminé.",
    deadlineLabel: "Date limite de signature",
    days: (days) => `${days} jours`,
    remindersLabel: "Relances automatiques",
    deadlineHelp:
      "Les liens de signature cessent de fonctionner à la date limite. Les relances sont envoyées au signataire dont c’est le tour, jusqu’à ce qu’il signe. Vous pourrez modifier ces deux réglages plus tard depuis la demande.",
    signatureTypeLabel: "Type de signature",
    simpleHelp:
      "Les signataires signent ici, et le PDF finalisé est scellé par cette installation.",
    providerHelp: (providerName, qualified) =>
      `Chaque signataire prouve son identité chez ${providerName} et signe avec un certificat à son nom. ${qualified ? "Une signature qualifiée nécessite un certificat qualifié, que tous les signataires n’ont pas. " : ""}Le type de signature requis pour un document est une question juridique ; ceci n’est pas un conseil juridique.`,
    send: "Envoyer la demande",
    dialogTitle: "Envoyer cette demande de signature ?",
    dialogBody: (title, signerCount, firstSignerName, deadlineDays) =>
      `« ${title} » sera envoyé à ${signerCount} ${frPlural(signerCount, "signataire", "signataires")}. ${
        signerCount === 1
          ? `${firstSignerName} sera prévenu(e) immédiatement.`
          : `Le premier signataire (${firstSignerName}) sera prévenu immédiatement.`
      } La demande expire dans ${deadlineDays} jours.`,
    signatureTypeNote: (signatureType) =>
      `Type de signature : ${signatureType}. Il ne pourra plus être modifié après l’envoi.`,
    permittedUsePrefix:
      "En envoyant, vous confirmez que ce document est un accord commercial ordinaire et non un testament, une décision de justice, une information du consommateur exigée par la loi ou tout autre",
    permittedUseLink: "document qui ne peut pas être signé électroniquement",
    permittedUseSuffix: ".",
    sendNow: "Envoyer maintenant",
    fieldSummary: (fieldCount) =>
      fieldCount === 0
        ? "Aucun champ placé (0 champ)"
        : `(${fieldCount} ${frPlural(fieldCount, "champ", "champs")})`,
  },

  detail: {
    loadErrorTitle: "Impossible de charger cette demande de signature",
    loadErrorDescription:
      "Impossible de charger cette demande de signature. Veuillez réessayer.",
    backToDocuments: "Retour aux documents",
    notFoundDescription:
      "Cette demande de signature est introuvable, ou vous n’y avez plus accès.",
    notFoundEyebrow: "Indisponible",
    notFoundTitle: "Cette demande de signature est indisponible",
    reminderHelper: (label) =>
      `Vous pourrez envoyer une nouvelle relance après le ${label}.`,
    deadlineExpired: (label) =>
      `${label ? `Date limite dépassée depuis le ${label}` : "Date limite dépassée"}. Personne ne peut signer tant que vous n’avez pas fixé une nouvelle date limite.`,
    deadlineExpires: (label) => `Expire le ${label}.`,
    noDeadline:
      "Aucune date limite. Chaque lien de signature est valable sept jours.",
    remindersOff: "Les relances automatiques sont désactivées.",
    remindersOn: (intervalDays) =>
      `Relances automatiques : ${frenchReminderInterval(intervalDays).toLowerCase()}.`,
    reminderError: "Impossible d’envoyer une relance pour le moment.",
    deadlineError: "Impossible de modifier la date limite.",
    correctError: "Impossible de corriger ce signataire.",
    remindersError: "Impossible de modifier les relances.",
    copyError: "Impossible de copier cette demande de signature.",
    deleteError: "Impossible de supprimer ce brouillon.",
    voidError: "Impossible d’annuler cette demande de signature.",
    documentsLink: "← Documents",
    statusLabels: {
      completed: "Terminé",
      declined: "Refusé",
      draft: "Brouillon",
      sent: "Envoyé",
      voided: "Annulé",
    },
    expired: "Expiré",
    signerStatusLabels: {
      declined: "Refusé",
      pending: "En attente",
      signed: "Signé",
      waiting: "À son tour",
    },
    created: (label) => `Créé le ${label}`,
    deleteDraft: "Supprimer le brouillon",
    continueEditing: "Reprendre la modification",
    voidEnvelope: "Annuler l’envoi",
    sendReminder: "Envoyer une relance",
    downloadCertificate: "Télécharger le certificat",
    downloadSigned: "Télécharger le PDF signé",
    copyToDraft: "Copier dans un nouveau brouillon",
    exportAudit: "Exporter la piste d’audit",
    setNewDeadline: "Fixer une nouvelle date limite",
    changeDeadline: "Modifier la date limite",
    changeReminders: "Modifier les relances",
    savedAsTemplate: (name) => `Enregistré comme modèle « ${name} ».`,
    viewTemplates: "Voir les modèles",
    templatePrompt:
      "Vous envoyez souvent ce type de document ? Conservez ses champs et son ordre de signature dans un modèle.",
    saveAsTemplate: "Enregistrer comme modèle",
    signers: "Signataires",
    total: (count) => `${count} au total`,
    change: "Modifier",
    receivesCopy: "Reçoit une copie",
    copySent: "Le document finalisé et son certificat ont été envoyés.",
    copyPending:
      "Recevra le document finalisé une fois que tout le monde aura signé.",
    timeline: "Historique",
    events: (count) => `${count} ${frPlural(count, "événement", "événements")}`,
    deleteDialog: {
      title: "Supprimer ce brouillon ?",
      lines: [
        "Ce brouillon n’a pas encore été envoyé.",
        "Le supprimer effacera définitivement le brouillon et ses champs placés.",
      ],
    },
    voidDialog: {
      title: "Annuler cette demande de signature ?",
      lines: [
        "Le processus de signature sera interrompu.",
        "Les signataires déjà prévenus seront informés de l’annulation.",
        "Cette action est irréversible.",
      ],
      reasonRequired: "Motif (obligatoire)",
      reasonOptional: "Motif (facultatif)",
      reasonHelp: "Conservé dans la piste d’audit de la demande.",
    },
    copyDialog: {
      title: "Copier dans un nouveau brouillon",
      lines: [
        "Un nouveau brouillon est créé avec le même document, les mêmes personnes et les mêmes champs. Rien de ce qui a été rempli n’est copié.",
        "Les codes d’accès ne sont pas copiés : ils sont stockés sous forme chiffrée et ne peuvent pas être repris. Vous pourrez en définir de nouveaux avant l’envoi.",
        "Personne ne reçoit d’e-mail, et cette demande reste inchangée.",
      ],
      copying: "Copie…",
    },
    deadlineDialog: {
      titleExpired: "Fixer une nouvelle date limite",
      title: "Modifier la date limite",
      countsFromNow:
        "La nouvelle date limite est calculée à partir de maintenant.",
      linkWorksAgain:
        "Le lien de signature déjà envoyé fonctionnera de nouveau.",
      linkKeepsWorking:
        "Le lien de signature déjà envoyé reste valable jusque-là.",
      label: "Date limite de signature",
      daysFromNow: (days) => `Dans ${days} jours`,
      save: "Enregistrer la date limite",
    },
    remindersDialog: {
      title: "Relances automatiques",
      help: "Une relance est envoyée au signataire dont c’est le tour lorsqu’il n’a pas eu de nouvelles de votre part depuis ce délai. Les relances s’arrêtent dès que tout le monde a signé ou que la date limite est passée.",
      label: "Envoyer une relance",
      save: "Enregistrer les relances",
    },
    correctDialog: {
      title: "Corriger ce signataire",
      help: "Le lien de signature déjà envoyé à cette personne ne fonctionnera plus. Si c’est son tour, une nouvelle invitation est envoyée à l’adresse corrigée.",
      save: "Enregistrer",
    },
  },

  templates: {
    title: "Modèles",
    description:
      "Les documents que vous envoyez souvent, avec leurs champs et leur ordre de signature déjà en place.",
    loadErrorDescription:
      "Impossible de charger vos modèles. Réessayez dans un instant.",
    loadErrorTitle: "Impossible de charger les modèles",
    emptyTitle: "Aucun modèle pour l’instant",
    emptyHelp:
      "Ouvrez un document que vous avez préparé ou envoyé et choisissez Enregistrer comme modèle. La prochaine fois, vous n’aurez qu’à indiquer qui signe.",
    goToDocuments: "Aller aux documents",
    saved: (label) => `Enregistré le ${label}`,
    signersLabel: (name) => `Signataires de ${name}`,
    deleteLabel: (name) => `Supprimer le modèle ${name}`,
    use: "Utiliser le modèle",
    deleteError: "Impossible de supprimer ce modèle.",
    deleteTitle: "Supprimer ce modèle ?",
    deleteRemoved: (name) => `« ${name} » sera supprimé définitivement.`,
    deleteNotAffected:
      "Les documents déjà créés à partir de ce modèle ne sont pas concernés.",
    deleting: "Suppression…",
    deleteConfirm: "Supprimer le modèle",
  },

  saveTemplate: {
    title: "Enregistrer comme modèle",
    intro:
      "Un modèle conserve ce document, l’emplacement de ses champs et l’ordre de signature. Il ne conserve ni les noms, ni les adresses e-mail, ni rien de ce qui a été rempli.",
    nameLabel: "Nom du modèle",
    whoSigns: "Qui signe",
    whoSignsHelp:
      "Nommez chaque place dans l’ordre de signature, par exemple Client ou Bailleur. Vous indiquerez de qui il s’agit à chaque utilisation du modèle.",
    defaultRoleName: (order) => `Signataire ${order}`,
    roleLabel: (order, signerName) => `Signataire ${order}, ici ${signerName}`,
    repeatedName: "Donnez un nom différent à chaque signataire.",
    save: "Enregistrer le modèle",
  },

  useTemplate: {
    title: "Utiliser un modèle",
    backToTemplates: "Retour aux modèles",
    loadError: "Impossible de charger ce modèle. Réessayez dans un instant.",
    cannotUse: "Ce modèle ne peut pas être utilisé",
    titleRequired: "Donnez un titre à la demande",
    envelopeTitle: "Titre de la demande",
    whoHeading: "Qui signe cette fois-ci ?",
    whoHelp:
      "Ils reçoivent le document dans cet ordre. Les champs sont déjà placés pour chacun d’eux.",
    nameAria: (roleName) => `Nom – ${roleName}`,
    emailAria: (roleName) => `E-mail – ${roleName}`,
    nothingSent:
      "Rien n’est encore envoyé. L’étape de vérification suit : vous pourrez encore modifier les champs, ajouter des destinataires en copie ou une vérification supplémentaire avant signature.",
    creating: "Création…",
    create: "Créer le brouillon",
  },

  dashboard: {
    title: "Documents",
    description:
      "Suivez vos brouillons, vos envois et vos accords signés au même endroit.",
    newEnvelope: "Nouvel envoi",
    filters: {
      All: "Tous",
      Completed: "Terminés",
      Declined: "Refusés",
      Draft: "Brouillons",
      Sent: "Envoyés",
      Voided: "Annulés",
    },
    filterLabel: "Filtrer les documents",
    search: "Rechercher par titre ou e-mail…",
    showing: (shown, total) =>
      `${shown} ${frPlural(shown, "envoi affiché", "envois affichés")} sur ${total}`,
    loadError: "Impossible de charger vos documents. Veuillez réessayer.",
    retry: "Réessayer",
    statusLabel: (label) => `Statut : ${label}`,
    statusLabels: {
      completed: "Terminé",
      declined: "Refusé",
      draft: "Brouillon",
      sent: "Envoyé",
      voided: "Annulé",
    },
    expired: "Expiré",
    createdPrefix: "Créé le ",
    uploadPdf: "Importer un PDF",
    noResultsTitle: "Aucun document ne correspond à votre recherche",
    noResultsHelp:
      "Essayez un autre titre, un autre e-mail de signataire ou un autre filtre de statut.",
    resetFilters: "Réinitialiser les filtres",
    emptyTitle: "Aucun document pour l’instant",
    emptyHelp:
      "Importez un PDF et envoyez-le en signature en quelques minutes.",
  },

  verify: {
    metaDescription:
      "Vérifiez qu’un PDF signé ou un certificat d’audit est exactement le fichier produit par ce site.",
    title: "Vérifier un document",
    description:
      "Vérifiez qu’un PDF signé ou un certificat d’audit est exactement le fichier produit par ce site à la fin de la signature. La moindre modification du fichier donne une empreinte différente.",
    sealHeading: "Vérifier le sceau dans un lecteur PDF",
    sealBody:
      "Les documents finalisés et les certificats portent aussi un sceau numérique. Ouvrez le fichier dans Adobe Acrobat Reader ou un autre lecteur PDF et consultez son panneau de signatures. Le lecteur indique si le document a été modifié depuis qu’il a été scellé. Sauf si l’organisation a installé un certificat délivré par une autorité de certification, le lecteur indiquera aussi que l’identité du signataire est inconnue ; c’est normal et cela n’affecte pas la détection des modifications.",
    couldNotCheck: "Le fichier ne peut pas être vérifié pour le moment.",
    couldNotRead: "Le fichier n’a pas pu être lu.",
    choose: "Choisissez un PDF signé ou un certificat d’audit",
    staysOnDevice:
      "Le fichier reste sur votre appareil. Seule son empreinte SHA-256 est envoyée.",
    inputLabel: "PDF à vérifier",
    checking: (fileName) => `Vérification de ${fileName ?? ""}…`,
    unchanged: (kind, title) =>
      `Ce fichier n’a pas été modifié. Il s’agit ${
        kind === "signed-document"
          ? "du document signé"
          : "du certificat d’audit"
      } produit par ce site pour « ${title} ».`,
    details: (status, finishedAt, signerCount, envelopeId) => {
      const statusWord = {
        completed: "terminée",
        declined: "refusée",
        voided: "annulée",
      }[status];

      return `La demande de signature a été ${statusWord}${finishedAt ? ` le ${finishedAt} UTC` : ""}, avec ${signerCount} ${frPlural(signerCount, "signataire", "signataires")}. Identifiant de la demande : ${envelopeId}.`;
    },
    noMatch: "Aucune correspondance.",
    noMatchHelp:
      "Ce site n’a pas produit ce fichier exact. Il a peut-être été modifié, réenregistré par un autre programme ou provient d’ailleurs. Demandez à l’expéditeur la copie conservée sur ce site.",
  },

  download: {
    metaTitle: "Lien de téléchargement expiré",
    title: "Ce lien de téléchargement a expiré",
    description:
      "Les liens de téléchargement sont valables pour une durée limitée. Vous pouvez en recevoir de nouveaux à l’adresse e-mail à laquelle ce document a été envoyé.",
    couldNotSend: "Impossible d’envoyer de nouveaux liens pour le moment.",
    sent: (maskedEmail) =>
      `De nouveaux liens sont en route vers ${maskedEmail}.`,
    button: "M’envoyer de nouveaux liens par e-mail",
  },

  labels: {
    sentTo: (emails) => `Envoyé à : ${emails || "—"}`,
    expiredWaitingOn: (date, email) =>
      `Expiré le ${date} · en attente de : ${email}`,
    waitingOn: (email) => `En attente de : ${email}`,
    declinedBy: (email) => `Refusé par : ${email}`,
    voidedOn: (date) => `Annulé le ${date}`,
    draftSummary: (signerCount, fieldCount) =>
      `${signerCount} ${frPlural(signerCount, "signataire", "signataires")} · ${fieldCount} ${frPlural(fieldCount, "champ placé", "champs placés")}`,
    expired: "Expiré",
    signedOf: (signedCount, signerCount) =>
      `${String(signedCount)} sur ${String(signerCount)} ${frPlural(signedCount, "a signé", "ont signé")}`,
    statuses: {
      completed: "Terminé",
      declined: "Refusé",
      draft: "Brouillon",
      sent: "Envoyé",
      voided: "Annulé",
    },
    signerSigned: (date) => `Signé le ${date}`,
    signerDeclined: (date) => `Refusé le ${date}`,
    signerNotified: (date) => `Prévenu le ${date}`,
    signerNotifiedBeforeVoid: "Prévenu avant l’annulation",
    signerSent: (date) => `Envoyé le ${date}`,
    readyAfter: (previousSignerName) =>
      `Sera prévenu après ${previousSignerName}`,
    readyAfterSend: "Sera prévenu à l’envoi",
    noNotification: "Aucune notification envoyée",
    lastNotifiedBeforeVoid: "Dernier signataire prévenu avant l’annulation",
    declineReason: (reason) => `Motif du refus : ${reason}`,
    skippedAfterDecline: "Ignoré après le refus",
    notReachedBeforeVoid: "Non atteint avant l’annulation",
    fieldsCompleted: (count) =>
      `${count} ${frPlural(count, "champ rempli", "champs remplis")}`,
    currentSigner: "Signataire en cours",
    fieldsAssigned: (count) =>
      `${count} ${frPlural(count, "champ attribué", "champs attribués")}`,
    signatureType: (level, provider) =>
      `Signatures électroniques ${level === "advanced" ? "avancées" : "qualifiées"}${provider ? ` via ${provider}` : ""}`,
    fileSize: (sizeBytes) =>
      sizeBytes < 1024 * 1024
        ? `${(sizeBytes / 1024).toFixed(1).replace(".", ",")} Ko`
        : `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`,
    pageCount: (count) =>
      `${String(count)} ${frPlural(count, "page", "pages")}`,
    fieldCount: (count) =>
      `${String(count)} ${frPlural(count, "champ", "champs")}`,
    timeline: {
      someoneSigner: "signataire",
      copied: "Copiée depuis une demande précédente",
      created: "Demande de signature créée",
      sent: (target) => `Envoyée à ${target}`,
      viewed: (target) => `Consultée par ${target}`,
      signedPart11: (target, meaning) =>
        `Signée par ${target} (${meaning}, mot de passe saisi de nouveau)`,
      signedWithProvider: (target, level, provider) =>
        `Signée par ${target} avec une signature électronique ${level === "advanced" ? "avancée" : "qualifiée"}${provider ? ` via ${provider}` : ""}`,
      signed: (target) => `Signée par ${target}`,
      declined: (target, reason) =>
        reason ? `Refusée par ${target} — ${reason}` : `Refusée par ${target}`,
      remindedManual: (target) => `Relance manuelle envoyée à ${target}`,
      remindedAuto: (target) => `Relance automatique envoyée à ${target}`,
      consented: (target) =>
        `${target} a accepté l’utilisation de documents et de signatures électroniques`,
      verified: (target) => `${target} a confirmé son identité`,
      verificationFailed: (target) =>
        `Code d’identité erroné saisi pour ${target}`,
      emailSent: (recipient) =>
        recipient
          ? `E-mail accepté pour distribution à ${recipient}`
          : "E-mail accepté pour distribution",
      completed: "PDF signé final et certificat générés",
      voided: (reason) =>
        reason
          ? `Demande annulée par l’expéditeur — ${reason}`
          : "Demande annulée par l’expéditeur",
      reauthenticationFailed: (target) =>
        `Mot de passe erroné saisi lors de la signature pour ${target}`,
      deadlineChanged: (deadline) =>
        deadline ? `Date limite fixée au ${deadline}` : "Date limite modifiée",
      expired: "Date limite dépassée avant que tout le monde ait signé",
      signerCorrected: ({ email, name, previousEmail, previousName }) => {
        const person = (
          personName: string | null,
          personEmail: string | null,
        ) =>
          personName && personEmail
            ? `${personName} <${personEmail}>`
            : (personName ?? personEmail ?? "signataire");
        const sameName =
          previousName !== null && name !== null && previousName === name;
        const sameEmail =
          previousEmail !== null &&
          email !== null &&
          previousEmail.toLowerCase() === email.toLowerCase();

        if (sameName && previousEmail && email) {
          return `E-mail du signataire corrigé : ${previousEmail} → ${email}`;
        }

        if (sameEmail && previousName && name) {
          return `Nom du signataire corrigé : ${previousName} → ${name}`;
        }

        if (!previousEmail && !email && previousName && name) {
          return previousName === name
            ? "L’e-mail du signataire a été corrigé"
            : `Nom du signataire corrigé : ${previousName} → ${name}`;
        }

        return `Signataire corrigé : ${person(previousName, previousEmail)} → ${person(name, email)}`;
      },
    },
  },

  pages: {
    appErrorDescription:
      "Une erreur s’est produite lors du chargement de cette page. Veuillez réessayer.",
    appErrorTitle: "Impossible de charger cette page.",
    tryAgain: "Réessayer",
    canvasErrorDescription:
      "Une erreur s’est produite à l’ouverture de ce document. Veuillez réessayer.",
    canvasErrorTitle: "Impossible d’ouvrir ce document.",
    reloadCanvas: "Recharger l’éditeur",
    loading: "Chargement de la page",
  },
};

const dictionaries: Record<Locale, EnvelopeMessages> = { en, fr };

/** The sender's pages' messages in the install's language. */
export function envelopeMessages(locale: Locale): EnvelopeMessages {
  return dictionaries[locale] ?? en;
}
