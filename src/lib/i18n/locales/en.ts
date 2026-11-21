import { defineMessages } from "../define-messages.ts";

export const enMessages = defineMessages({
  footer: {
    accessibilityLong: "Accessibility Statement",
    accessibilityShort: "Accessibility",
    ariaLabel: "Footer",
    contact: "Contact",
    english: "English",
    indonesian: "Bahasa Indonesia",
    languageAriaLabel: "Choose a language",
    permittedUseLong: "What this is for",
    permittedUseShort: "E-signatures",
    poweredBy: "Powered by {productName}",
    privacyLong: "Privacy Policy",
    privacyNotice: "Privacy notice",
    privacyShort: "Privacy",
    termsLong: "Terms of Service",
    termsShort: "Terms",
  },
  landing: {
    actions: {
      goToDashboard: "Go to dashboard",
      logIn: "Log in",
      startFree: "Start free",
    },
    closing: {
      body: "No credit card. No per-envelope fees. Just upload and send.",
      note: "Free • no signer account required • up to 25 signers per document",
      title: "Send your next agreement. On us.",
    },
    comparison: {
      feature: "Feature",
      included: "Included",
      notIncluded: "Not included",
      perSeatPlans: "Per-seat plans",
      rows: {
        envelopes: {
          feature: "Envelopes per month",
          perSeat: "Capped by plan",
          signudoc: "Unlimited",
        },
        price: {
          feature: "Price",
          perSeat: "Per user, every month",
          signudoc: "Free forever",
        },
        reminders: {
          feature: "Reminders",
          perSeat: "Higher plans only",
        },
        signers: {
          feature: "Signers per document",
          perSeat: "Varies by plan",
          signudoc: "Up to 25",
        },
      },
    },
    faq: {
      items: [
        {
          answer:
            "Nope. You sign in to send documents, but your signers just click a link and sign. No account, no friction.",
          question: "Do signers need a Sakta account?",
        },
        {
          answer:
            "Signature, initials, date, text, and checkbox. Everything most documents need.",
          question: "What field types can I place on a document?",
        },
        {
          answer:
            "Yes. Hit the remind button and they get a nudge. No need to resend the whole document.",
          question: "Can I remind a signer if they are taking too long?",
        },
        {
          answer:
            "You get the final signed PDF plus a tamper-proof certificate. Download both in one click.",
          question: "What do I get when everyone finishes signing?",
        },
      ],
      marker: "FAQ",
      title: "Quick answers.",
    },
    hero: {
      headline: "Sign PDFs Online for Free.",
      headlineAccent: "No catch.",
      lead: "Upload a PDF, drop in signature fields, and send. That's it.",
      marker: "Free e-signature software",
      seeHowItWorks: "See how it works",
    },
    metadata: {
      description:
        "Free e-signature software for small businesses. Upload, send, sign — no enterprise circus required.",
    },
    nav: {
      ariaLabel: "Public navigation",
    },
    pricing: {
      lead: "Everything below is included. Forever. For $0. See how that stacks up against a typical per-seat e-signature plan.",
      marker: "Pricing",
      signersNote: "Your signers never need to create an account.",
      title: "Free beats $120 a year.",
    },
    security: {
      lead: "Every PDF is encrypted, every action is logged, and every signing link is cryptographically secured. The code is open source so you can verify it yourself.",
      marker: "Security",
      pillars: [
        {
          body: "Documents are kept in private, encrypted storage. All connections use HTTPS with HSTS enforcement.",
          title: "Encrypted at rest and in transit",
        },
        {
          body: "Every view, signature, and decline is logged with timestamps and IP addresses. Download the certificate PDF as proof.",
          title: "Complete audit trail",
        },
        {
          body: "Each signer gets a unique cryptographic token. Links expire at the deadline the sender sets and can't be guessed or reused.",
          title: "Secure signing links",
        },
        {
          body: "The entire codebase is public. Inspect the security model, audit the logic, or self-host on your own infrastructure.",
          title: "Open source",
        },
      ],
      title: "Your documents stay safe.",
    },
    workflow: {
      lead: "Upload a PDF, set the signing order, place fields, and hit send. Your signers don't even need an account.",
      marker: "How it works",
      steps: [
        {
          body: "Bring the contract you already wrote. No template rebuilding.",
          title: "Upload your PDF",
        },
        {
          body: "Pick who signs first, second, third. Each person gets invited after the last one finishes.",
          title: "Add signers",
        },
        {
          body: "Drop signature, initials, date, text, and checkbox fields onto the page.",
          title: "Place fields",
        },
        {
          body: "Fire off a signing link. Nudge the slow ones. Download the final PDF.",
          title: "Send and track",
        },
      ],
      title: "Four steps. One signed document.",
    },
  },
  email: {
    legalFooter: {
      contact: "Contact",
      privacyNotice: "Privacy notice",
      privacyPolicy: "Privacy Policy",
      questions: "Questions? Contact {supportAddress}.",
      sentBy: "Sent using {productName}.",
      sentByOrganization: "Sent by {organizationName} using {productName}.",
      terms: "Terms of Service",
    },
    completedSender: {
      body: '"{title}" has been fully signed in {productName}.',
      cta: "Review the completed envelope",
      dashboard:
        "The final signed PDF and certificate are ready in your dashboard.",
      greeting: "Hi {senderName},",
      subject: '"{title}" is fully signed',
    },
    completedSigner: {
      attached:
        "The completed document and its certificate are attached. Keep them: they are your copy of the agreement.",
      body: '"{title}" from {senderName} has been fully signed in {productName}.',
      certificate: "Redacted certificate: {url}",
      copyOnly: "{senderName} asked for you to receive a copy.",
      downloadCertificate: "Download redacted certificate",
      downloadSigned: "Download signed PDF",
      greeting: "Hi {signerName},",
      htmlLinksIntro:
        "Download links are available for {days} days. An expired link offers to send a new one.",
      linksIntro:
        "Download links (available for {days} days; an expired link offers to send a new one):",
      ready: "The completed document and its certificate are ready.",
      signedPdf: "Signed PDF: {url}",
      subject: '"{title}" is fully signed',
    },
    declinedSender: {
      body: '{signerName} ({signerEmail}) declined "{title}" in {productName}.',
      cta: "Review the envelope",
      greeting: "Hi {senderName},",
      reason: "Reason provided: {reason}",
      subject: '"{title}" was declined by {signerName}',
    },
    downloadLinks: {
      certificate: "Certificate: {url}",
      ctaCertificate: "Download certificate",
      ctaSigned: "Download signed PDF",
      greeting: "Hi {signerName},",
      intro:
        'Here are new download links for "{title}" in {productName}. They work for {days} days.',
      keep: "Download and keep the files: they are your copy of the record.",
      signedPdf: "Signed PDF: {url}",
      subject: 'New download links for "{title}"',
    },
    reminder: {
      introAutomatic:
        '{senderName} is still waiting for your signature on "{envelopeTitle}", sent through {productName}.',
      introManual:
        '{senderName} sent you a reminder to sign "{envelopeTitle}" through {productName}.',
      subjectAutomatic:
        'Reminder: {senderName} is waiting for your signature on "{envelopeTitle}"',
      subjectManual:
        '{senderName} sent you a reminder to sign "{envelopeTitle}"',
    },
    signingInvitation: {
      cta: "Review and sign the document",
      deadline: "This request expires on {deadline}.",
      greeting: "Hi {signerName},",
      newestLink:
        "If you receive a newer invitation or reminder link, use the newest one.",
      noAccount: "You do not need a {productName} account to sign.",
      sent: '{senderName} sent you "{envelopeTitle}" through {productName}.',
      subject: '{senderName} requested your signature on "{envelopeTitle}"',
    },
    signingCode: {
      body: 'Your code to open "{title}" in {productName} is:',
      greeting: "Hi {signerName},",
      subject: 'Your code for "{title}"',
      validity:
        "It works for {minutes} minutes. If you did not just open a signing link, ignore this email.",
    },
    voidNotification: {
      body: '{senderName} voided "{title}" in {productName}.',
      greeting: "Hi {signerName},",
      outcomeSigned:
        "The signing process has been canceled, so the document you signed will not be completed. No further action is needed.",
      outcomeUnsigned:
        "The signing process has been canceled. No further action is needed.",
      subject: '"{title}" was voided by {senderName}',
    },
  },
  done: {
    closeTab: "You can close this tab.",
    emailNotice:
      "You'll receive an email with the signed document once all parties have signed.",
    fallbackTitle: "this document",
    recorded: 'Your signature has been recorded for "{title}".',
    title: "You're all done.",
  },
  verify: {
    form: {
      choose: "Choose a signed PDF or audit certificate",
      checkError: "The file could not be checked right now.",
      checking: "Checking {fileName}...",
      fileLabel: "PDF to verify",
      finishedAt: " on {date} UTC",
      matchBody:
        "The envelope was {status}{finishedAt} with {signerCount} {signers}. Envelope ID {envelopeId}.",
      matchTitle:
        'This file is unchanged. It is the {fileKind} this site produced for "{title}".',
      noMatchBody:
        "This site did not produce this exact file. It may have been changed, saved again by another program, or come from somewhere else. Ask the sender for the copy kept on this site.",
      noMatchTitle: "No match.",
      privacy:
        "The file stays on your device. Only its SHA-256 fingerprint is sent.",
      readError: "The file could not be read.",
      signersMany: "signers",
      signersOne: "signer",
      statuses: {
        completed: "completed",
        declined: "declined",
        voided: "voided",
      },
      types: {
        certificate: "audit certificate",
        signedDocument: "signed document",
      },
    },
    metadata: {
      description:
        "Check that a signed PDF or audit certificate is exactly the file this site produced.",
      title: "Verify a document",
    },
    page: {
      description:
        "Check that a signed PDF or audit certificate is exactly the file this site produced when signing finished. Any change to the file, however small, gives a different fingerprint.",
      sealBody:
        "Finished documents and certificates also carry a digital seal. Open the file in Adobe Acrobat Reader or another PDF reader and look at its signature panel. The reader says whether the document has been changed since it was sealed. Unless the organization has installed a certificate from a certificate authority, the reader will also say the signer's identity is unknown; that is expected and does not affect the check for changes.",
      sealHeading: "Checking the seal in a PDF reader",
      title: "Verify a document",
    },
  },
  signing: {
    live: {
      aria: {
        agreeToElectronicRecords:
          "I agree to use electronic records and signatures",
        confirmSignatureMeaning: "I confirm the meaning of my signature",
        documentPage: "Document page",
        drawSignatureCanvas: "Draw signature canvas",
        nextPage: "Next page",
        previousPage: "Previous page",
        signaturePreview: "{kind} preview",
      },
      assignedFields: "Assigned fields",
      beforeYouSign: {
        description:
          '{senderName} sent you "{envelopeTitle}" to sign electronically.',
        title: "Before you sign",
      },
      completedAlt: "{signerName} completed {kind}",
      currentSigner: "Current signer",
      decline: {
        cancel: "Cancel",
        confirm: "Decline to sign",
        confirming: "Declining...",
        description:
          "The sender ({senderName}) will be notified that you declined. This cannot be undone.",
        dialogTitle: "Decline to sign?",
        reasonLabel: "Reason (optional)",
        reasonPlaceholder: "I'd like to discuss some terms first...",
        toolbarButton: "Decline",
      },
      declinedConfirmation: {
        description:
          "Your decline has been recorded. No further action is needed, and this link no longer opens the document.",
        title: "You declined to sign",
      },
      defaultConsentErrorMessage:
        "Your agreement could not be saved right now.",
      defaultDeclineErrorMessage:
        "We couldn't record your decline right now. Reload the page or request a fresh signing link from the sender.",
      defaultSubmitErrorMessage:
        "We couldn't finish signing right now. Reload the page or request a fresh signing link from the sender.",
      document: {
        allRequiredComplete: "All required fields complete",
        fieldAnswerTooLong:
          "This answer is too long to fit in its box on the document. Shorten it to {maxCharacters} characters or fewer.",
        invalidNumberNotice:
          "A number field marked in red does not hold a number. {numberEntryMessage}",
        lockedValuesHelper:
          "Previous signer values stay visible but locked. Only your assigned fields are interactive.",
        numberEntryMessage: "Enter a number, such as 1250 or 12.5.",
        readyToFinish: "Ready to finish",
        remainingFieldsMany: "{count} required fields remaining",
        remainingFieldsOne: "{count} required field remaining",
        textFieldTooLong:
          "A text box on page {page} is full: shorten your answer to {count} characters or fewer so all of it fits on the document.",
      },
      downloadPdf: "Download PDF",
      field: {
        canvasLabels: {
          checkbox: "Checkbox",
          date: "Date",
          dropdown: "Choose",
          fallback: "Field",
          initials: "Initial",
          name: "Name",
          number: "Number",
          radio: "Option",
          signature: "Sign",
          text: "Text",
        },
        completionValues: {
          checked: "Checked",
          chooseOne: "Choose one",
          enterANumber: "Enter a number",
          enterText: "Enter text",
          notANumber: "Not a number",
          optional: "Optional",
          tapToSign: "Tap to sign",
        },
        inputLabels: {
          checkbox: "Checkbox",
          date: "Date",
          dropdown: "Choose one",
          fallback: "Field",
          initials: "Initial here",
          name: "Name",
          number: "Enter a number",
          radio: "Option",
          signature: "Sign here",
          text: "Enter text",
        },
        noAnswer: "No answer",
        signatureKinds: {
          initials: "initials",
          signature: "signature",
        },
        summaryLabels: {
          checkbox: "Checkbox",
          choice: "Choice",
          date: "Date",
          dropdown: "Dropdown",
          fallback: "Field",
          initials: "Initials",
          name: "Name",
          number: "Number",
          signature: "Signature",
          textInput: "Text input",
        },
        unchecked: "Unchecked",
      },
      fieldStatus: {
        complete: "Complete",
        fixThis: "Fix this",
        required: "Required",
      },
      finish: {
        agreeAndContinue: "Agree and continue",
        back: "Back",
        bindingNotice:
          "By clicking Finish, you confirm that your electronic signature is intended to be binding for this document.",
        button: "Finish",
        confirmMeaningCheckbox:
          "I confirm this meaning. My name, the date and time, and this meaning will be printed with my signature.",
        description: 'You are signing "{envelopeTitle}" from {senderName}.',
        continueToProvider: "Continue to {providerName}",
        finishing: "Finishing...",
        finishSigning: "Finish signing",
        meaningHeading: "Meaning of your signature",
        preparing: "Preparing...",
        providerBindingNotice:
          "Next, {providerName} asks you to confirm who you are and to approve the signature. When it is done, you come back here. By continuing, you confirm that your signature is intended to be binding for this document.",
        providerSignatureIntro:
          "This document asks for {signatureLevel}, made with a certificate in your own name.",
        reauthEmailLabel: "Email address",
        reauthHelper:
          "Enter your account's email address and password to sign.",
        reauthPasswordLabel: "Password",
        signatureLevels: {
          advanced: "an advanced electronic signature",
          qualified: "a qualified electronic signature",
        },
        summaryRowLabel: "{label} · Page {page}",
        title: "Finish signing?",
      },
      fromSender: "From {senderName}",
      pageLabel: "Page {page} of {total}",
      providerProblems: {
        cancelled:
          "You did not finish signing at {providerName}. Nothing was signed, so you can try again.",
        expired:
          "Your earlier signing session ended before it finished. Nothing was signed, so you can try again.",
        failed:
          "{providerName} could not complete your signature. Nothing was signed. Try again, or ask the sender for help.",
        name: "The certificate you signed with at {providerName} is not in the name this document was sent to. Nothing was signed. If the name is wrong, ask the sender to send the document again under the name on your certificate.",
      },
      signatureModal: {
        addInitials: "Add your initials",
        addSignature: "Add your signature",
        applyInitials: "Apply initials",
        applySignature: "Apply signature",
        cancel: "Cancel",
        canvasClearedMany: "Canvas cleared {count} times",
        canvasClearedOne: "Canvas cleared {count} time",
        clear: "Clear",
        description:
          "By signing, you agree that this electronic signature is the legal equivalent of your manual signature.",
        drawnInitials: "Drawn initials",
        drawnSignature: "Drawn signature",
        drawTab: "Draw",
        drawWithMouseOrFinger: "Draw with mouse or finger",
        renderedInStyle: "Rendered in signature style",
        typeInitials: "Type initials",
        typeSignature: "Type signature",
        typeTab: "Type",
        typeYourInitials: "Type your initials",
        typeYourSignature: "Type your signature",
      },
      toolbar: {
        currentSignerView: "Current signer view",
        noFieldsOnPage: "No fields on this page",
        readyToFinish: "Ready to finish",
        remainingMany: "{count} required remaining",
        remainingOne: "{count} required remaining",
        signedValuesVisible: "Locked values visible",
      },
    },
    states: {
      "already-signed": {
        description: "You already completed your signature for this document.",
        title: "You've already signed",
      },
      completed: {
        description:
          "Everyone has signed this document. No further action is needed.",
        title: "This envelope has been completed",
      },
      declined: {
        description:
          "A signer declined this document. No further action is needed.",
        title: "This envelope has been declined",
      },
      embeddedExpiredDescription:
        "Ask the app you are using for a new signing link.",
      error: {
        description:
          "We couldn't load this document right now. Reload the page or request a fresh signing link from the sender.",
        title: "Something went wrong. Please try again.",
      },
      expired: {
        description: "Request a new signing link from the sender.",
        title: "This link has expired",
      },
      voided: {
        description:
          "The sender cancelled this document. No further action is needed.",
        title: "This envelope has been voided",
      },
    },
    verification: {
      checkError: "The code could not be checked right now.",
      codeAlreadySent:
        "A code was already sent to {maskedEmail} less than a minute ago, so no new email went out. Use that code, or send a new one when the countdown on the button ends.",
      codeResendReady:
        "A code was sent to {maskedEmail}. If it has not arrived, you can send a new one now.",
      codeSent: "A code was sent to {maskedEmail}.",
      continue: "Continue",
      emailHelper: "The address this document was sent to ({maskedEmail}).",
      emailLabel: "Email address",
      firstCode: "Email me a code",
      intro:
        "{senderName} asked for a check before you open “{envelopeTitle}”.",
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
      },
      newCodeSent: "A new code was sent to {maskedEmail}.",
      resendError: "The code could not be sent right now.",
      resendIn: "Send a new code in {seconds}s",
      resendNew: "Send a new code",
      step: "Step {step} of {total}.",
      title: "Confirm it's you",
    },
  },
});

export type Messages = typeof enMessages;
