import { test, expect } from "@playwright/test";

const LOAD_TIMEOUT = 15_000;

async function blockClientEnhancement(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route("**/bundle.js", async (route) => {
    await route.abort();
  });
}

async function waitForHydratedShellControls(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.locator("code-playground .file-tab").first().waitFor({
    state: "visible",
    timeout: LOAD_TIMEOUT,
  });

  await page.locator("theme-switcher .theme-toggle").waitFor({
    state: "visible",
    timeout: LOAD_TIMEOUT,
  });
}

test.describe("prerendered theme snapshots", () => {
  test("should match the prerendered topbar snapshot when the system prefers light", async ({
    page,
  }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.removeItem("pc-theme"));
    await blockClientEnhancement(page);

    // Act
    await page.goto("/es/01-hello");
    const topbar = page.locator(".pg-topbar");

    // Assert
    await expect(topbar).toContainText("Auto");
    await expect(topbar).toHaveScreenshot("prerender-topbar-light.png");
  });

  test("should match the prerendered topbar snapshot when the system prefers dark", async ({
    page,
  }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => localStorage.removeItem("pc-theme"));
    await blockClientEnhancement(page);

    // Act
    await page.goto("/es/01-hello");
    const topbar = page.locator(".pg-topbar");

    // Assert
    await expect(topbar).toContainText("Auto");
    await expect(topbar).toHaveScreenshot("prerender-topbar-dark.png");
  });

  test("should match hydrated topbar snapshots before and after a theme switch", async ({
    page,
  }) => {
    // Arrange
    await page.addInitScript(() => localStorage.setItem("pc-theme", "light"));

    // Act
    await page.goto("/es/01-hello");
    await waitForHydratedShellControls(page);
    const topbar = page.locator(".pg-topbar");
    const themeButton = page.locator("theme-switcher .theme-toggle");

    // Assert
    await expect(themeButton).toContainText("Claro");
    await expect(topbar).toHaveScreenshot("hydrated-topbar-light.png");

    await themeButton.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(themeButton).toContainText("Oscuro");
    await expect(topbar).toHaveScreenshot("hydrated-topbar-dark.png");
  });
});