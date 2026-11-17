import assert from "node:assert/strict";
import { test } from "node:test";

import { type Branding } from "../branding.ts";
import { formatDeadline } from "../envelope-deadline.ts";
import { withUserEmailLegalFooter } from "../services/email-legal-footer.ts";
import { buildSigningInvitationEmail } from "../services/signing-invitation-email.ts";
import {
  buildCompletionSenderEmail,
  buildCompletionSignerEmail,
} from "../signing.ts";
import { emailMessages } from "./email-messages.ts";

const branding: Branding = {
  brandColor: null,
  contactUrl: null,
  hosted: false,
  locale: "en",
  logoUrl: null,
  organizationName: "Acme",
  privacyUrl: null,
  productName: "Acme Sign",
  signupAvailable: true,
  supportAddress: null,
  termsUrl: null,
};
const french: Branding = { ...branding, locale: "fr" };

const invitation = {
  envelopeTitle: "Contrat <cadre> & annexes",
  expiresAt: 1_800_000_000,
  senderName: "Jeanne Martin",
  signerEmail: "paul@example.com",
  signerName: "Paul Durand",
  signingUrl: "https://sign.acme.com/sign/abc",
};

test("the invitation is written in French on a French install", () => {
  const email = buildSigningInvitationEmail({
    ...invitation,
    branding: french,
  });

  assert.equal(
    email.subject,
    "Jeanne Martin vous demande de signer « Contrat <cadre> & annexes »",
  );
  assert.equal(
    email.textBody.split("\n").slice(0, 9).join("\n"),
    [
      "Bonjour Paul Durand,",
      "",
      "Jeanne Martin vous a envoyé « Contrat <cadre> & annexes » via Acme Sign.",
      "",
      "Consultez et signez le document ici :",
      "https://sign.acme.com/sign/abc",
      "",
      "Cette demande de signature expire le 15 janvier 2027 à 08:00 UTC.",
      "",
    ].join("\n"),
  );
  assert.match(email.textBody, /Envoyé par Acme avec SignuDoc\./);
  // The title is still escaped in the HTML body.
  assert.match(
    email.htmlBody ?? "",
    /vous a envoyé &laquo;&nbsp;Contrat &lt;cadre&gt; &amp; annexes&nbsp;&raquo; via Acme Sign\./,
  );
  assert.match(email.htmlBody ?? "", />Consulter et signer le document<\/a>/);
  assert.doesNotMatch(email.htmlBody ?? "", /<cadre>/);
});

test("the invitation stays in English by default", () => {
  const email = buildSigningInvitationEmail({ ...invitation, branding });

  assert.equal(
    email.subject,
    'Jeanne Martin requested your signature on "Contrat <cadre> & annexes"',
  );
  assert.match(
    email.textBody,
    /This request expires on January 15, 2027 at 8:00 AM UTC\./,
  );
  assert.match(email.textBody, /Sent by Acme using SignuDoc\./);
});

test("the completion emails are written in French on a French install", () => {
  const previousAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://sign.acme.com";

  try {
    const toSigner = buildCompletionSignerEmail({
      attached: true,
      branding: french,
      envelopeId: "env_1",
      envelopeTitle: "Bail",
      evidenceDownloadUrl: "https://sign.acme.com/d/evidence",
      senderName: "Jeanne Martin",
      signedDownloadUrl: "https://sign.acme.com/d/signed",
      signerEmail: "paul@example.com",
      signerName: "Paul Durand",
    });

    assert.equal(
      toSigner.subject,
      "Le document « Bail » est entièrement signé",
    );
    assert.equal(
      toSigner.textBody.split("\n").slice(0, 8).join("\n"),
      [
        "Bonjour Paul Durand,",
        "",
        "Le document « Bail » envoyé par Jeanne Martin a été signé par tous les signataires dans Acme Sign.",
        "Le document finalisé et son certificat sont joints à cet e-mail. Conservez-les : ils constituent votre exemplaire de l’accord.",
        "",
        "Liens de téléchargement (valables 7 jours ; un lien expiré propose d’en envoyer un nouveau) :",
        "PDF signé : https://sign.acme.com/d/signed",
        "Certificat expurgé : https://sign.acme.com/d/evidence",
      ].join("\n"),
    );
    assert.match(toSigner.htmlBody, />Télécharger le PDF signé<\/a>/);

    const toSender = buildCompletionSenderEmail({
      branding: french,
      envelopeId: "env_1",
      envelopeTitle: "Bail",
      senderEmail: "jeanne@example.com",
      senderName: "Jeanne Martin",
    });

    assert.equal(toSender.subject, toSigner.subject);
    assert.match(
      toSender.textBody,
      /Consultez la demande de signature terminée :\nhttps:\/\/sign\.acme\.com\/envelopes\/env_1/,
    );
  } finally {
    if (previousAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = previousAppUrl;
    }
  }
});

test("the legal footer and deadlines follow the language", () => {
  const footer = withUserEmailLegalFooter(
    { htmlBody: "<p>x</p>", textBody: "x" },
    { ...french, supportAddress: "aide@acme.fr" },
    { APP_URL: "https://sign.acme.com" },
  );

  assert.match(footer.textBody, /Informations sur la confidentialité ?:/);
  assert.match(footer.textBody, /Des questions \? Écrivez à aide@acme\.fr\./);
  assert.equal(
    formatDeadline(1_800_000_000, "fr"),
    "15 janvier 2027 à 08:00 UTC",
  );
  assert.equal(emailMessages("fr").quote("A"), "« A »");
});
