import { expect, type Locator, type Page, test } from "@playwright/test";

import { signInAsAdministrator } from "./support/admin-session";
import { extractLink, waitForEmail } from "./support/outbox";
import { writeSamplePdf } from "./support/sample-pdf";

// Runs after signing-flow.spec.ts, which sets up the install and its
// administrator.

const SIGNER_EMAIL = "sam.small@example.com";

async function dragBy(page: Page, handle: Locator, dx: number, dy: number) {
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

test("a small date box still shows its label and its date", async ({
  browser,
  page,
}, testInfo) => {
  await test.step("the sender shrinks a date box and still sees its label", async () => {
    await signInAsAdministrator(page);
    await page.goto("/envelopes/new");
    await page.getByLabel("Envelope title").fill("Small date box");
    await page
      .getByLabel("Upload PDF")
      .setInputFiles(await writeSamplePdf(testInfo.outputPath("small.pdf")));
    await page.getByRole("button", { name: "Next ->" }).click();
    await page.getByLabel("Signer 1 name").fill("Sam Small");
    await page.getByLabel("Signer 1 email").fill(SIGNER_EMAIL);
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page).toHaveURL(/\/prepare$/);

    await page.getByRole("button", { exact: true, name: "Signature" }).click();

    const target = page.getByLabel("Place Signature on page 1");
    const box = (await target.boundingBox())!;

    await target.click({
      position: { x: box.width * 0.4, y: box.height * 0.3 },
    });
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page
      .getByRole("button", { exact: true, name: "Date" })
      .first()
      .click();
    await page
      .getByLabel("Place Date on page 1")
      .click({ position: { x: box.width * 0.4, y: box.height * 0.4 } });
    await expect(page.getByRole("status")).toHaveText("Saved");

    const dateField = page.getByRole("button", { name: "Sam Small · Date" });
    const before = (await dateField.boundingBox())!;

    // Shorter and narrower than the size below which the label used to hide.
    await dragBy(
      page,
      page.getByRole("button", { name: "Resize Date field from bottom-right" }),
      -before.width * 0.4,
      -before.height * 0.4,
    );
    await expect(page.getByRole("status")).toHaveText("Saved");
    await expect(dateField.getByText("Date", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Next →" }).click();
    await page.getByRole("button", { name: "Send envelope" }).click();

    const confirmation = page.getByRole("dialog", {
      name: "Send this envelope?",
    });

    await confirmation.getByRole("checkbox").check();
    await confirmation.getByRole("button", { name: "Send now" }).click();
    await expect(page).toHaveURL(/\/envelopes\/[^/]+$/);
  });

  await test.step("the signer sees the whole date in the small box", async () => {
    const invitation = await waitForEmail({
      template: "signing_invitation",
      to: SIGNER_EMAIL,
    });
    const signerContext = await browser.newContext({
      viewport: { height: 900, width: 1440 },
    });
    const signerPage = await signerContext.newPage();

    await signerPage.goto(extractLink(invitation.text, "/sign/"));

    const consent = signerPage.getByRole("dialog", { name: "Before you sign" });

    await consent
      .getByRole("checkbox", {
        name: "I agree to use electronic records and signatures",
      })
      .check();
    await consent.getByRole("button", { name: "Agree and continue" }).click();

    const date = signerPage
      .locator("[data-signing-field] p")
      .filter({ hasText: /^[A-Z][a-z]+ \d{1,2}, \d{4}$/ });

    await expect(date).toBeVisible();

    // Not cut off: the text fits inside its box.
    const fits = await date.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    );

    expect(fits).toBe(true);
    await signerContext.close();
  });
});
