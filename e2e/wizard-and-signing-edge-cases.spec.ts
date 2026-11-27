import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

import { signInAsAdministrator } from "./support/admin-session";
import { extractLink, waitForEmail } from "./support/outbox";
import { writeSamplePdf } from "./support/sample-pdf";

// Runs after signing-flow.spec.ts, which sets up the install and its
// administrator.

async function startEnvelope(
  page: Page,
  title: string,
  pdfPath: string,
  signers: readonly { email: string; name: string }[],
) {
  await signInAsAdministrator(page);
  await page.goto("/envelopes/new");
  await page.getByLabel("Envelope title").fill(title);
  await page.getByLabel("Upload PDF").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Next ->" }).click();
  await expect(page).toHaveURL(/\/signers$/);

  for (const [index, signer] of signers.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "+ Add another signer" }).click();
    }

    await page.getByLabel(`Signer ${String(index + 1)} name`).fill(signer.name);
    await page
      .getByLabel(`Signer ${String(index + 1)} email`)
      .fill(signer.email);
  }
}

async function place(page: Page, tool: string, signer: string, y: number) {
  await page
    .getByRole("button", { name: new RegExp(`${signer} \\d+ fields? placed`) })
    .click();
  await page.getByRole("button", { exact: true, name: tool }).first().click();

  const target = page.getByLabel(`Place ${tool} on page 1`);
  const box = (await target.boundingBox())!;

  await target.click({ position: { x: box.width * 0.3, y: box.height * y } });
  await expect(page.getByRole("status")).toHaveText("Saved");
}

async function dragBy(page: Page, handle: Locator, dx: number, dy: number) {
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

async function send(page: Page) {
  await page.getByRole("button", { name: "Send envelope" }).click();

  const confirmation = page.getByRole("dialog", {
    name: "Send this envelope?",
  });

  await confirmation.getByRole("checkbox").check();
  await confirmation.getByRole("button", { name: "Send now" }).click();
  await expect(page).toHaveURL(/\/envelopes\/[^/]+$/);
}

async function openInvitation(browser: Browser, email: string) {
  const invitation = await waitForEmail({
    template: "signing_invitation",
    to: email,
  });
  const context = await browser.newContext({
    viewport: { height: 900, width: 1440 },
  });
  const signerPage = await context.newPage();

  await signerPage.goto(extractLink(invitation.text, "/sign/"));

  const consent = signerPage.getByRole("dialog", { name: "Before you sign" });

  await consent
    .getByRole("checkbox", {
      name: "I agree to use electronic records and signatures",
    })
    .check();
  await consent.getByRole("button", { name: "Agree and continue" }).click();
  await expect(consent).toBeHidden();

  return { context, signerPage };
}

test("an edit undone while it is being saved is saved as undone, and Saving... clears", async ({
  page,
}, testInfo) => {
  const signer = { email: "una.undo@example.com", name: "Una Undo" };

  await startEnvelope(
    page,
    "Undo while saving",
    await writeSamplePdf(testInfo.outputPath("undo.pdf")),
    [signer],
  );
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page).toHaveURL(/\/prepare$/);
  await place(page, "Text", signer.name, 0.3);

  const required = page.getByRole("button", { exact: true, name: "Required" });
  const optional = page.getByRole("button", { exact: true, name: "Optional" });

  // A new text field starts optional.
  await expect(optional).toHaveAttribute("aria-pressed", "true");

  await test.step("undone before its autosave runs: nothing is sent, and it says Saved", async () => {
    let saves = 0;
    const countSaves = (request: { method(): string; url(): string }) => {
      if (request.method() === "PUT" && request.url().endsWith("/fields")) {
        saves += 1;
      }
    };

    // Let the save from placing the field finish first.
    await page.waitForTimeout(1000);
    page.on("request", countSaves);
    // Both within the autosave's half-second wait, as a quick double change.
    await page.evaluate(async () => {
      const button = (name: string) =>
        [...document.querySelectorAll("button")].find(
          (candidate) => candidate.textContent === name,
        );

      button("Required")?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      button("Optional")?.click();
    });
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.waitForTimeout(1000);
    page.off("request", countSaves);
    expect(saves).toBe(0);
  });

  await test.step("undone while its save is on the way: the undone version is what's kept", async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let isFirst = true;

    await page.route("**/api/envelopes/*/fields", async (route) => {
      if (isFirst && route.request().method() === "PUT") {
        isFirst = false;
        await held;
      }

      await route.continue();
    });

    const saving = page.waitForRequest(
      (request) =>
        request.method() === "PUT" && request.url().endsWith("/fields"),
    );

    await required.click();
    await saving;
    await optional.click();
    release();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.unrouteAll({ behavior: "wait" });

    await page.reload();
    await page.getByRole("button", { name: `${signer.name} · Text` }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Optional" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test("approvers are counted apart from signers, and a shared step with one is not called signing", async ({
  page,
}, testInfo) => {
  const approver = { email: "ari.approver@example.com", name: "Ari Approver" };
  const sam = { email: "sam.same@example.com", name: "Sam Same" };
  const pat = { email: "pat.later@example.com", name: "Pat Later" };

  await startEnvelope(
    page,
    "Counted apart",
    await writeSamplePdf(testInfo.outputPath("counted.pdf")),
    [approver, sam, pat],
  );
  await page.getByLabel("Signer 1 role").selectOption("approver");
  await page
    .getByRole("checkbox", { name: "Sign at the same time as Signer 1" })
    .check();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page).toHaveURL(/\/prepare$/);
  await place(page, "Signature", sam.name, 0.3);
  await place(page, "Signature", pat.name, 0.5);
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page).toHaveURL(/\/review$/);

  await expect(page.getByText("2 signers · 1 approver")).toBeVisible();
  await send(page);
  await expect(
    page.getByText("Sent to Ari Approver and Sam Same at the same time"),
  ).toBeVisible();
  await expect(page.getByText(/to sign at the same time/)).toHaveCount(0);
});

test("a number too long for its box is flagged while typing, and a decline reason stops at its limit", async ({
  browser,
  page,
}, testInfo) => {
  const signer = { email: "nina.number@example.com", name: "Nina Number" };

  await test.step("the sender places a small number box", async () => {
    await startEnvelope(
      page,
      "Small number box",
      await writeSamplePdf(testInfo.outputPath("number.pdf")),
      [signer],
    );
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page).toHaveURL(/\/prepare$/);
    await place(page, "Signature", signer.name, 0.2);
    await place(page, "Number", signer.name, 0.4);

    const numberField = page.getByRole("button", {
      name: `${signer.name} · Number`,
    });
    const before = (await numberField.boundingBox())!;

    await dragBy(
      page,
      page.getByRole("button", {
        name: "Resize Number field from bottom-right",
      }),
      -before.width * 0.75,
      -before.height * 0.5,
    );
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.getByRole("button", { name: "Next →" }).click();
    await send(page);
  });

  await test.step("the signer is told while typing that the number doesn't fit", async () => {
    const { context, signerPage } = await openInvitation(browser, signer.email);
    const number = signerPage.locator("input[inputmode=decimal]");

    await number.fill("1234567890123456789012345678901234567890");
    await expect(number).toHaveAttribute("aria-invalid", "true");
    await expect(
      signerPage.getByText(/A number box on page 1 is full/),
    ).toBeVisible();

    await signerPage
      .getByRole("button", { exact: true, name: "Decline" })
      .click();

    const reason = signerPage.getByLabel("Reason (optional)");

    await reason.fill("x".repeat(1100));
    expect((await reason.inputValue()).length).toBe(1000);
    await context.close();
  });
});
