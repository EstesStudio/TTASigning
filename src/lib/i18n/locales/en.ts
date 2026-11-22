import { defineMessages } from "../define-messages.ts";

export const enMessages = defineMessages({
  common: {
    lastUpdated: "Last updated {date}",
  },
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
      allPlans: "See all plans",
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
  pricingPage: {
    bottom: {
      body: "Sakta is open source under MIT. Run it on your own infrastructure, or ask us for a dedicated hosted instance.",
      cta: "Talk to us",
      title: "Need your own installation?",
    },
    cards: {
      business: {
        cta: "Contact us",
        footnote: "Invoices with NPWP available.",
        name: "Business",
        tagline: "For companies that need to connect systems.",
      },
      free: {
        cta: "Start free",
        footnote: "No credit card. No expiry.",
        name: "Free",
        tagline: "For trying the whole signing loop.",
      },
      standard: {
        cta: "Start free",
        footnote: "Billed yearly, cancel anytime.",
        name: "Standard",
        tagline: "For small teams that sign every week.",
      },
    },
    comparison: {
      feature: "Feature",
      lead: "Every plan signs PDFs, records consent and seals the result. Higher plans add the tools a growing team needs.",
      rows: [
        {
          business: "Unlimited",
          free: "Unlimited",
          label: "Documents per month",
          standard: "Unlimited",
        },
        {
          business: "Up to 25",
          free: "Up to 25",
          label: "Signers per document",
          standard: "Up to 25",
        },
        {
          business: "Included",
          free: "Included",
          label: "Signing without an account",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Included",
          label: "Signing order and copy recipients",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Included",
          label: "Audit trail, sealed PDF and certificate",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Included",
          label: "Public Verify page",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Reusable templates",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Deadlines and automatic reminders",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Your own logo and brand color",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Access codes and emailed one-time codes",
          standard: "Included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Bulk send from a CSV",
          standard: "Not included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "API, webhooks and embedded signing",
          standard: "Not included",
        },
        {
          business: "Included",
          free: "Not included",
          label: "Single sign-on (OpenID Connect)",
          standard: "Not included",
        },
        {
          business: "Priority email",
          free: "GitHub issues",
          label: "Support",
          standard: "Email",
        },
      ],
      title: "Compare every plan",
    },
    cycle: {
      annual: "Yearly",
      free: "Free forever",
      label: "Billing period",
      monthly: "Monthly",
      perMonth: "per month",
      perUser: "per user",
      perYear: "per year",
      save: "Save 2 months",
    },
    featured: "Most popular",
    hero: {
      eyebrow: "Pricing",
      lead: "The same signing loop the big platforms sell per seat, at a fraction of the price. No envelope allowance and no surprise fees.",
      note: "Prices in Indonesian rupiah. Yearly plans include two months free.",
      title: "Every signature, at a price that makes sense here.",
    },
    included: "Included",
    metadata: {
      description:
        "Simple, transparent e-signature pricing for Indonesian teams. Start free, then pay only for the seats you need.",
      title: "Pricing | Sakta",
    },
    notIncluded: "Not included",
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
  legal: {
    privacy: {
      hero: {
        description:
          "This policy explains what personal data Sakta processes, why we process it, who receives it, how long we keep it, and the rights available to you under Indonesian law.",
        title: "Privacy Policy",
      },
      metadata: {
        description:
          "Read how Sakta collects, uses, shares, retains, and protects personal data in line with Indonesia's PDP Law.",
        title: "Privacy Policy | Sakta",
      },
      sections: {
        changes: {
          heading: "13. Changes to this policy",
          paragraphs: [
            "We may update this policy to reflect changes in the service or in the law. If the data we collect or the purposes of processing change, we will inform you before the change takes effect, as required by Article 21 of the PDP Law.",
            "The current version is always available at /privacy, with its effective date shown at the top of the page.",
          ],
        },
        children: {
          heading: "12. Children",
          paragraphs: [
            "Sakta is not directed to children. For this policy, a child is a person under 18 years of age who is not married, consistent with the PDP Law and its implementing regulation.",
            "We do not knowingly collect a child's personal data without the consent of a parent or guardian. If you believe a child has provided data through Sakta, contact us so we can review the record and, where required, obtain guardian consent or delete the data.",
          ],
        },
        contact: {
          contactWithSupport:
            "For questions, requests, or complaints about this policy, write to {supportAddress} or use the {contactLink} page.",
          heading: "14. Contact and complaints",
          paragraphs: [
            "If you are not satisfied with our response, you may lodge a complaint with the personal data protection institution or the competent authority in Indonesia. Until the dedicated PDP authority is established, complaints can be directed to the relevant ministry.",
          ],
        },
        cookies: {
          closing:
            "Optional Vercel BotID processing applies only when that feature is enabled. You can clear these cookies and the local cache in your browser, although you may need to sign in again.",
          heading: "8. Cookies, verification, and local storage",
          intro:
            "We use cookies and browser storage only to operate and secure the service:",
          items: [
            "better-auth.session_token — keeps you signed in for 7 days.",
            "better-auth.session_data and better-auth.account_data — short-lived authentication cache, valid for 5 minutes.",
            "dont_remember and OAuth/PKCE cookies — keep sign-in state and protect login for 5 to 10 minutes.",
            "sd_v_<token hash prefix> — verifies a signer after an access code, account check, or email code, valid for 8 hours.",
            "NEXT_LOCALE — remembers your language preference for 365 days. It is used only for language selection and can be read by scripts.",
            "IndexedDB signudoc-draft-preview-cache — caches draft PDF previews in your browser for up to 24 hours.",
          ],
        },
        dataCategories: {
          heading: "2. Personal data we process",
          intro: "We process the following categories of personal data:",
          items: [
            "Account data: name, email address, password credential stored as a hash, email verification status, profile image, and account settings.",
            "Authentication and session data: session identifiers, IP address, user agent, sign-in events, two-factor secrets and backup codes, and OAuth/SSO identifiers when you use single sign-on.",
            "Document and workflow data: uploaded PDFs, titles, page counts, placed fields, routing order, envelope status, templates, and generated files such as thumbnails, sealed PDFs, and certificates.",
            "Signer data: name, email, role, locale, access method, typed or drawn signature, field values, checkbox selections, decline reasons, and timestamps.",
            "Audit and security data: audit events, actor email, IP address, user agent, token identifiers, API key hashes, hash-chain values, and webhook delivery records.",
            "Communications and support data: messages you send through the contact form or email, including name, email, message content, and rate-limit context.",
            "Organization settings: organization name, sender and support addresses, retention settings, consent notice, and hosted configuration.",
            "Preferences and local state: your language choice and the browser-side draft preview cache described in section 8.",
          ],
        },
        incidents: {
          heading: "11. Security and personal data breaches",
          noticeItems: [
            "the personal data that was exposed;",
            "when and how it was exposed; and",
            "the steps we took to handle and recover from the incident.",
          ],
          paragraphs: [
            "We use access controls, audit logging, rate limits, security headers, encryption in transit, and private object storage to protect personal data. No system is completely secure.",
            "If a personal data protection failure occurs, we will notify affected data subjects and the competent institution in writing within 3 × 24 hours, as required by Article 46 of the PDP Law. The notice will contain at least:",
          ],
          publicNotice:
            "Where the failure is likely to affect the public, we will also issue a public notice.",
        },
        purposes: {
          heading: "4. Purposes and legal bases",
          intro:
            "We process personal data only for the purposes below and on the legal bases available under Article 20 of the PDP Law:",
          rows: [
            {
              basis:
                "Basis: performance of a contract and our legitimate interest in account security.",
              purpose:
                "Creating accounts, authenticating users, and sending verification or security messages.",
            },
            {
              basis:
                "Basis: performance of a contract and compliance with legal obligations for electronic records under UU ITE and PP 71/2019.",
              purpose:
                "Preparing, sending, signing, declining, and storing envelopes, including audit trails and sealed PDFs.",
            },
            {
              basis: "Basis: performance of a contract.",
              purpose:
                "Sending transactional emails and, where enabled, attaching completed documents or certificates.",
            },
            {
              basis:
                "Basis: legitimate interests and compliance with security obligations under the PDP Law.",
              purpose:
                "Detecting fraud, abuse, and unauthorized access, and enforcing rate limits and security controls.",
            },
            {
              basis:
                "Basis: legitimate interests, contract performance, and legal obligations.",
              purpose:
                "Providing support and responding to privacy, accessibility, and account-closure requests.",
            },
            {
              basis:
                "Basis: legitimate interests and legal obligations; we do not use personal data for advertising.",
              purpose:
                "Managing retention, deletion, backups, and service improvements.",
            },
            {
              basis:
                "Basis: legal obligations and legitimate interests in establishing, exercising, or defending legal claims.",
              purpose:
                "Handling complaints, disputes, and requests from regulators or courts.",
            },
          ],
        },
        recipients: {
          closing:
            "We do not sell personal data, do not run an advertising business, and have not configured SMS messaging or third-party analytics in the hosted service. Where a provider processes data on our behalf, we use contractual arrangements as required by the PDP Law.",
          heading: "5. Recipients and service providers",
          intro:
            "We share personal data only with providers that need it to run Sakta, with participants in an envelope, or where the law requires it. The main recipients are:",
          items: [
            "Vercel — application hosting, edge and network services, and optional BotID bot protection.",
            "Vercel Blob — private storage for uploaded documents, generated PDFs, certificates, and backups.",
            "Neon or another PostgreSQL provider — database hosting for account, envelope, signer, and audit records.",
            "Resend — transactional email delivery; completed-document emails may include signed PDFs or certificates as attachments.",
            "Have I Been Pwned (api.pwnedpasswords.com) — optional password breach check that sends only the first characters of a SHA-1 hash; this check can be disabled.",
            "eID Easy and CSC — optional electronic signing providers that receive a document name, MIME type, SHA-256 digest, and signing metadata.",
            "RFC 3161 timestamp servers and OCSP/CRL responders — receive digests or certificate status requests to validate seals.",
            "Your configured OIDC/SSO provider — receives authentication redirects and the openid, email, and profile scopes when you sign in that way.",
            "Webhook endpoints configured by your organization — receive envelope and signer event payloads chosen by the administrator.",
            "Optional log drain/SIEM providers — receive security and audit logs when enabled.",
          ],
        },
        requests: {
          heading: "10. How to make a request",
          paragraphs: [
            "We may ask for information to verify your identity, such as control of the email address, recent account activity, or envelope details. We will not ask for more data than necessary.",
            "We will respond within 30 days of receiving a complete request. If we need more time or refuse a request, we will explain why. Requests are free unless they are unreasonable or repetitive, in which case we may charge a reasonable administrative fee or decline as allowed by law.",
          ],
          requestWithSupport:
            "To exercise a right, write to {supportAddress} or use the {contactLink} page. You can also request account closure in settings, and an organization administrator can use the signer-data export and erasure tools for envelopes the organization sent.",
        },
        retention: {
          closing:
            "You may ask us to delete signer data earlier. We will do so unless a legal obligation or an in-progress envelope prevents it.",
          heading: "7. Retention and deletion",
          intro:
            "We keep personal data only as long as needed for the purpose it was collected, then delete or anonymize it, subject to the following periods:",
          items: [
            "Unsent draft envelopes and their source documents: deleted after 30 days without sender activity.",
            "Completed, signed, declined, and voided envelopes: kept while the account is active, or for the retention period set by the organization. A scheduled deletion waits 14 days and gives the sender a download link first.",
            "Account closure: after notice and a 30-day export window, stored documents and envelope records are deleted, except records we must keep for security, legal compliance, or disputes.",
            "Audit and security logs: kept as long as needed to investigate incidents, meet legal obligations, and enforce agreements.",
            "Backup copies: kept for up to 30 days by default, then removed on the backup rotation.",
            "Expired recipient download-token records: deleted after 365 days.",
            "Part 11 envelopes and records under a legal hold are not removed by the automatic retention job.",
          ],
        },
        rights: {
          heading: "9. Your rights under the PDP Law",
          intro:
            "Under the PDP Law you may, subject to the conditions in that law:",
          items: [
            "receive clear information about our identity, the purposes, and the legal basis for processing (Article 5);",
            "complete, update, or correct your personal data (Article 6);",
            "access your data and receive a copy (Article 7);",
            "end processing, delete, or destroy your data (Article 8);",
            "withdraw consent where processing is based on consent (Article 9);",
            "object to decisions based solely on automated processing that have legal or similarly significant effects (Article 10);",
            "restrict or delay processing where the purpose no longer requires it (Article 11);",
            "receive your data in a structured, commonly used, machine-readable format and transmit it to another controller where technically feasible (Article 13); and",
            "bring a claim and receive compensation for a breach of data processing (Article 12).",
          ],
          limitations:
            "Some rights may be excluded in the circumstances listed in Article 15 of the PDP Law, such as law enforcement or public-interest processing. We may also keep limited records where necessary to establish, exercise, or defend legal claims.",
        },
        scope: {
          heading: "1. Scope, controller, and privacy contact",
          paragraphs: [
            "This Privacy Policy explains how Sakta processes personal data when you use the hosted service at sakta.my.id, including the website, account and dashboard, signing pages, emails, and support channels. It applies to account holders, senders, signers, recipients, and visitors.",
            "For the purposes of the Indonesian Personal Data Protection Law (UU PDP No. 27 of 2022), Sakta acts as the personal data controller for the processing described here. Questions about the controller's identity and the privacy contact can be sent through the channel in section 14.",
          ],
        },
        sources: {
          heading: "3. Where the data comes from",
          intro: "We obtain data from:",
          items: [
            "you directly, when you register, upload documents, invite signers, fill fields, sign, decline, or contact support;",
            "the signer or other participants in an envelope you sent;",
            "your device and browser automatically when you use the service, including IP address and user agent;",
            "optional identity or signing providers when you choose to use them; and",
            "your organization's administrator when they create or manage your account and settings.",
          ],
        },
        transfers: {
          heading: "6. Transfers outside Indonesia",
          paragraphs: [
            "Some of the providers above may process data outside Indonesia, including in the United States. When that happens, we seek to ensure that the destination country offers a level of personal data protection equivalent to or higher than the PDP Law, or that adequate and binding safeguards are in place, as required by Article 56.",
            "If neither condition can be met, we will ask for your consent where Article 56(4) of the PDP Law requires it. You may contact us to ask which safeguards apply to a specific provider.",
          ],
        },
      },
    },
    terms: {
      hero: {
        description:
          "These Terms govern your access to and use of Sakta, an electronic signature service for businesses in Indonesia. They cover ordinary commercial agreements and are not legal advice.",
        title: "Terms of Service",
      },
      metadata: {
        description:
          "Read the terms that govern use of the Sakta e-signature service in Indonesia.",
        title: "Terms of Service | Sakta",
      },
      sections: {
        acceptableUse: {
          heading: "6. Account security and acceptable use",
          paragraphs: [
            "Protect your credentials, limit access to your account, and notify Sakta promptly if you suspect unauthorized use. Do not use Sakta to break the law, infringe rights, transmit malware, harass recipients, scrape data, disrupt the service, or bypass access controls and rate limits.",
            "Do not use Sakta to impersonate someone else, obtain signatures by deception, or send spam or bulk messages unrelated to a real signing workflow.",
          ],
        },
        contact: {
          contactWithSupport:
            "Questions about these Terms can be sent to {supportAddress} or through the {contactLink} page.",
          heading: "14. Contact",
        },
        disclaimers: {
          heading: "10. Disclaimers",
          paragraphs: [
            'Sakta is provided "as is" and "as available" to the extent allowed by law. Sakta disclaims warranties, express or implied, including merchantability, fitness for a particular purpose, title, noninfringement, accuracy, uninterrupted availability, and legal sufficiency for a specific transaction.',
            "Sakta does not warrant that a workflow will be accepted by a court or regulator, or suit a regulated or excluded document. Get legal advice about enforceability, retention, consumer disclosures, notarization, or local requirements.",
          ],
        },
        electronicSignatures: {
          heading: "5. Electronic signatures and records",
          paragraphs: [
            "For documents within the permitted scope, Sakta is designed to create and keep electronic signatures and records in line with Indonesian law, including the Electronic Information and Transactions Law (UU ITE) as amended and Government Regulation No. 71 of 2019. Each envelope keeps an audit trail and a sealed copy of the signed PDF.",
            "Sakta does not issue a certified digital certificate from an approved trust service provider and does not promise that a workflow meets every sector-specific rule on identity checks, certificates, or notarization.",
          ],
        },
        eligibility: {
          heading: "2. Eligibility and authority",
          paragraphs: [
            "You may use Sakta only if you can enter into a binding agreement under Indonesian law and only for lawful business purposes. You are responsible for ensuring that every sender, signer and recipient has authority to act for the party they represent.",
            "You are also responsible for deciding whether your transaction needs witnesses, notarization, a specific form, or a retention rule that Sakta does not provide.",
          ],
        },
        governingLaw: {
          heading: "13. Governing law and changes",
          paragraphs: [
            "These Terms are governed by the laws of the Republic of Indonesia, without regard to conflict-of-law rules. Disputes that cannot be settled amicably will be brought before the courts with jurisdiction in Indonesia. If the Indonesian and English versions differ, the Indonesian version prevails.",
            "Sakta may update these Terms by posting a revised version on this page. Updates take effect when posted unless a later date is stated.",
          ],
        },
        indemnification: {
          heading: "12. Indemnification",
          paragraphs: [
            "You will defend and hold harmless Sakta, its affiliates, service providers, licensors, and personnel from claims, losses, damages, liabilities, costs, and expenses, including reasonable legal fees, arising out of your documents, your use of the service, your breach of these Terms, or your violation of law or another person's rights, except where mandatory law provides otherwise.",
          ],
        },
        intellectualProperty: {
          heading: "8. Intellectual property and your content",
          paragraphs: [
            "As between you and Sakta, you keep ownership of the documents and data you upload, subject to the rights Sakta and its providers need to host, process, transmit, display, secure, and store them to run the service.",
            "Sakta, its brand, software, and interface are protected by intellectual-property law. Except where the law allows it, you may not copy, resell, reverse engineer, or create derivative works from the service.",
          ],
        },
        liability: {
          heading: "11. Limitation of liability",
          paragraphs: [
            "To the extent allowed by law, Sakta and its affiliates, providers, licensors, and staff are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, data, or use arising from the service or these Terms.",
            "To the extent allowed by law, Sakta's total liability for all claims arising from the service or these Terms will not exceed the greater of the amount you paid for the service in the 12 months before the event or Rp1,000,000. Nothing in these Terms excludes liability that cannot be excluded under the Indonesian Consumer Protection Law or other mandatory law.",
          ],
        },
        overview: {
          heading: "1. Overview",
          paragraphs: [
            "By creating an account, uploading a document, sending an envelope, or signing through Sakta, you agree to these Terms. If you act for a company or other organization, you confirm that you are authorized to bind it to these Terms.",
            "Sakta provides software for preparing, sending, signing, and storing electronic records. It is not a law firm and does not give legal advice. It does not decide whether a particular document may validly be signed electronically.",
            "The service is intended for businesses and organizations operating in Indonesia and for their ordinary commercial agreements. Indonesian law, including the Electronic Information and Transactions Law (UU ITE) and its implementing regulations, applies to electronic signatures and records.",
          ],
        },
        permittedUse: {
          closing:
            "If a document falls into a regulated, safety-sensitive, consumer, estate, court, or family-law category, do not use Sakta. By sending an envelope you confirm that the document is an ordinary business agreement within this permitted use.",
          excluded: [
            "wills, inheritances, and testamentary trusts;",
            "adoption, divorce, and other family-law matters;",
            "court orders, summonses, pleadings, and other official court documents;",
            "notices of cancellation or termination of basic utility services such as water, electricity, or gas;",
            "notices of default, acceleration, repossession, foreclosure, or eviction involving a primary residence;",
            "notices of cancellation of health or life insurance benefits;",
            "product recall notices or notices of serious defects that may endanger health or safety;",
            "documents that must accompany the transport or handling of hazardous materials, pesticides, or other dangerous goods;",
            "statutory consumer disclosures or other workflows that require a separate electronic-consent process before delivery.",
          ],
          excludedIntro:
            "Do not use Sakta for documents or notices that by law require a special form, notarization, physical delivery, or a separate consumer-consent process, including:",
          heading: "3. Permitted use and excluded documents",
          paragraphs: [
            "Sakta is for ordinary business agreements and comparable commercial records, such as NDAs, statements of work, vendor and service agreements, and internal approvals.",
          ],
        },
        sender: {
          heading: "4. Sender responsibilities",
          paragraphs: [
            "Senders are responsible for the content they upload, the routing order, the fields they place, the recipients they invite, and the legal sufficiency of the process. You must have the rights needed to upload the document and request signatures.",
            "Keep signer contact details accurate, avoid misleading envelopes, and handle any required notices or offline steps outside Sakta when needed.",
          ],
        },
        serviceChanges: {
          heading: "7. Service changes, availability, and records",
          paragraphs: [
            "Sakta may change, improve, suspend, or discontinue features at any time. We may add limits on document size, signer count, storage, or retention as the service grows, and may remove content or suspend accounts that appear to breach these Terms or create legal, operational, or security risk.",
            "Download and keep your own copies of completed documents. Storage on Sakta is a convenience and follows the retention and deletion practices in the Privacy Policy, including obligations under the Personal Data Protection Law (UU PDP No. 27 of 2022).",
          ],
        },
        suspension: {
          closureWithSupport:
            "You can request account closure in settings or by writing to {supportAddress}. Before closing, download any documents you want to keep. After closure we may offer a short export window and then delete stored document files and envelope records, except limited information kept for security, fraud prevention, legal compliance, or dispute resolution.",
          heading: "9. Suspension, termination, and account closure",
          paragraphs: [
            "You may stop using the service at any time. Sakta may suspend or terminate access if we reasonably believe you breached these Terms, used the service outside its permitted scope, or created security, fraud, or legal risk.",
          ],
        },
      },
    },
  },
});

export type Messages = typeof enMessages;
