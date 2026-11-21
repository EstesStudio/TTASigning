import { expect, test } from "@playwright/test";

// No signing flow here: the public Verify page is enough to show that a
// browser's language reaches the server, sets the locale cookie and survives
// a later request. Signing URLs themselves stay exactly as they were.
test("Accept-Language picks Indonesian and the cookie keeps it", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "id-ID" });
  const page = await context.newPage();

  await page.goto("/verify");

  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Verifikasi dokumen",
  );
  await expect(
    page.getByText("Periksa bahwa PDF yang telah ditandatangani"),
  ).toBeVisible();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "NEXT_LOCALE")?.value).toBe(
    "id",
  );

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");

  await context.close();
});

test("English remains the default", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();

  await page.goto("/verify");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Verify a document",
  );

  await context.close();
});
