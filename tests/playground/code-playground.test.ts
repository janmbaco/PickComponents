import { test, expect } from "@playwright/test";
import { PLAYGROUND_EXAMPLES } from "../../examples/src/features/examples-catalog/models/example-catalog.js";
import { buildExamplePath } from "../../examples/src/features/routing/models/playground-routes.js";

/**
 * Browser-based integration tests for `<code-playground>`.
 *
 * These tests run against the real examples server to verify that:
 *   - Manifest-driven 2-tab examples load, render tabs, and produce output.
 *   - Richer manifest-driven examples load all tabs (with filenames),
 *     transpile inter-module imports correctly, and produce output.
 *   - Tab switching, Run, and Reset actions work end-to-end.
 *
 * Requires `npm run build:examples` to have been run before.
 */

// ── Helpers ──────────────────────────────────────────
const LOAD_TIMEOUT = 15_000;

/**
 * Waits for the playground component to finish mounting editors and
 * rendering the initial result.
 */
async function waitForPlayground(page: import("@playwright/test").Page) {
  // Wait for at least one .file-tab to appear (editors mounted)
  await page.locator("code-playground .file-tab").first().waitFor({
    state: "visible",
    timeout: LOAD_TIMEOUT,
  });
}

/**
 * Returns the visible iframe preview element inside the playground shadow DOM.
 */
function previewFrame(page: import("@playwright/test").Page) {
  return page.locator("code-playground #preview-frame");
}

async function previewContentFrame(page: import("@playwright/test").Page) {
  const handle = await previewFrame(page).elementHandle();
  return handle?.contentFrame() ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ── Manifest-driven 2-tab example (01-hello) ─────────
test.describe("Manifest-driven 2-tab playground (hello)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/01-hello");
    await waitForPlayground(page);
  });

  test("should show a themed skeleton while the example source is loading", async ({
    page,
  }) => {
    await page.route(
      "**/playground-examples/**/hello.example.ts",
      async (route) => {
        await delay(650);
        await route.continue();
      },
    );

    await page.goto("/en/01-hello");

    const skeleton = page.locator(
      'code-playground [data-state="playground-loading"]',
    );

    await expect(skeleton).toBeVisible();
    await expect(skeleton).toContainText("Preparing example");
    await expect(skeleton.locator("svg")).toBeVisible();

    await waitForPlayground(page);
    await expect(skeleton).toHaveCount(0);
  });

  test("should render two file tabs with filenames", async ({ page }) => {
    // Arrange
    const tabs = page.locator("code-playground .file-tab");

    // Act & Assert
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toContainText("hello.example.ts");
    await expect(tabs.nth(1)).toContainText("index.html");
  });

  test("should display TS icon on first tab and HTML icon on second", async ({
    page,
  }) => {
    // Arrange
    const icons = page.locator("code-playground .file-tab .file-icon");

    // Act & Assert
    await expect(icons.nth(0)).toHaveText("TS");
    await expect(icons.nth(1)).toHaveText("</>");
  });

  test("should show first tab as active by default", async ({ page }) => {
    // Arrange
    const tabs = page.locator("code-playground .file-tab");

    // Act & Assert
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });

  test("should produce output in the preview iframe", async ({ page }) => {
    // Arrange
    const iframe = previewFrame(page);

    // Act — wait for srcdoc to be set (non-empty)
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
    const srcdoc = await iframe.getAttribute("srcdoc");

    // Assert — the srcdoc should contain the HTML body and a module script
    expect(srcdoc).toContain("<main>");
    expect(srcdoc).toContain('<script type="module">');
    expect(srcdoc).toContain("pick-components");
  });

  test("should switch active tab when clicking second tab", async ({
    page,
  }) => {
    // Arrange
    const tabs = page.locator("code-playground .file-tab");

    // Act
    await tabs.nth(1).click();

    // Assert
    await expect(tabs.nth(0)).not.toHaveClass(/active/);
    await expect(tabs.nth(1)).toHaveClass(/active/);
  });
});

// ── Multi-tab example (11-di) ────────────────────────
test.describe("Multi-tab playground (di)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/11-di");
    await waitForPlayground(page);
  });

  test("should render eight file tabs with filenames", async ({ page }) => {
    // Arrange
    const tabs = page.locator("code-playground .file-tab");

    // Act & Assert
    await expect(tabs).toHaveCount(8);
    await expect(tabs.nth(0)).toContainText("di.example.ts");
    await expect(tabs.nth(1)).toContainText("di.template.html");
    await expect(tabs.nth(2)).toContainText("di.styles.css");
    await expect(tabs.nth(3)).toContainText("users.initializer.ts");
    await expect(tabs.nth(4)).toContainText("services.ts");
    await expect(tabs.nth(5)).toContainText("container.ts");
    await expect(tabs.nth(6)).toContainText("main.ts");
    await expect(tabs.nth(7)).toContainText("index.html");
  });

  test("should display correct language icons for each tab", async ({
    page,
  }) => {
    // Arrange
    const icons = page.locator("code-playground .file-tab .file-icon");

    // Act & Assert
    await expect(icons.nth(0)).toHaveText("TS");
    await expect(icons.nth(1)).toHaveText("</>");
    await expect(icons.nth(2)).toHaveText("CSS");
    await expect(icons.nth(3)).toHaveText("TS");
    await expect(icons.nth(4)).toHaveText("TS");
    await expect(icons.nth(5)).toHaveText("TS");
    await expect(icons.nth(6)).toHaveText("TS");
    await expect(icons.nth(7)).toHaveText("</>");
  });

  test("should set srcdoc on the preview iframe after auto-run", async ({
    page,
  }) => {
    // Arrange
    const iframe = previewFrame(page);

    // Act & Assert — srcdoc should be populated (non-empty)
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
  });

  test("should include __pg__ bare specifiers in the srcdoc import map", async ({
    page,
  }) => {
    // Arrange
    const iframe = previewFrame(page);

    // Act
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
    const srcdoc = await iframe.getAttribute("srcdoc");

    // Assert — the import map should use __pg__/ prefix for local modules
    expect(srcdoc).toContain("__pg__/container.js");
    expect(srcdoc).toContain("__pg__/di.example.js");
  });

  test("should not contain broken relative ./file.js in srcdoc import map", async ({
    page,
  }) => {
    // Arrange
    const iframe = previewFrame(page);

    // Act
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
    const srcdoc = await iframe.getAttribute("srcdoc");

    // Assert — no relative specifiers should remain for local modules
    expect(srcdoc).not.toContain('"./container.js"');
    expect(srcdoc).not.toContain('"./di.example.js"');
  });

  test("should produce valid srcdoc with import map and HTML body", async ({
    page,
  }) => {
    // Arrange & Act — wait for the srcdoc to be set
    const iframe = previewFrame(page);
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
    const srcdoc = await iframe.getAttribute("srcdoc");

    // Assert — srcdoc should have an import map with __pg__ entries and HTML body
    expect(srcdoc).toContain("<main>");
    expect(srcdoc).toContain('<script type="importmap">');
    expect(srcdoc).toContain('<script type="module">');
    expect(srcdoc).toContain("__pg__/");
  });

  test("should not display transpilation errors", async ({ page }) => {
    // Arrange & Act
    const errorOutput = page.locator("code-playground .error-output");

    // Assert
    await expect(errorOutput).toHaveCount(0);
  });

  test("should hydrate users through InjectKit constructor injection", async ({
    page,
  }) => {
    await page.route(
      "https://jsonplaceholder.typicode.com/users",
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: 1,
              name: "Ada Lovelace",
              email: "ada@example.test",
            },
            {
              id: 2,
              name: "Grace Hopper",
              email: "grace@example.test",
            },
          ]),
        });
      },
    );

    await page.goto("/en/11-di");
    await waitForPlayground(page);

    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect(frame.locator("di-example")).toContainText(
      "2 users via InjectKit",
    );
    await expect(frame.locator("di-example")).toContainText("Ada Lovelace");
    await expect(frame.locator("di-example")).not.toContainText(
      "Failed to load users.",
    );
  });

  test("should place import declarations at module top level in srcdoc", async ({
    page,
  }) => {
    // Arrange — static imports inside try/catch are a SyntaxError
    const iframe = previewFrame(page);
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });

    // Act
    const srcdoc = (await iframe.getAttribute("srcdoc")) ?? "";
    const scriptMatch = srcdoc.match(
      /<script type="module">([\s\S]*?)<\/script>/,
    );
    const scriptContent = scriptMatch?.[1] ?? "";

    // Assert — no import declaration should appear inside a try block
    const tryCatchStart = scriptContent.indexOf("try {");
    const importLines = scriptContent
      .split("\n")
      .filter((l) => /^\s*import\s/.test(l));

    for (const importLine of importLines) {
      const importPos = scriptContent.indexOf(importLine);
      expect(importPos).toBeLessThan(tryCatchStart);
    }
  });

  test("should switch tabs correctly", async ({ page }) => {
    // Arrange
    const tabs = page.locator("code-playground .file-tab");

    // Act — click on the "users.initializer.ts" tab (index 3)
    await tabs.nth(3).click();

    // Assert
    await expect(tabs.nth(0)).not.toHaveClass(/active/);
    await expect(tabs.nth(3)).toHaveClass(/active/);

    // The editor for users.initializer.ts should be visible
    const editors = page.locator("code-playground .editor-wrap");
    await expect(editors.nth(0)).not.toHaveClass(/active/);
    await expect(editors.nth(3)).toHaveClass(/active/);
  });

  test("should re-run after clicking Run and produce output", async ({
    page,
  }) => {
    // Arrange — wait for initial load
    const iframe = previewFrame(page);
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });

    // Act — click the run button
    await page.locator("code-playground .run-btn").click();

    // Assert — srcdoc should be repopulated
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
  });

  test("should not produce runtime errors inside the preview iframe", async ({
    page,
  }) => {
    // Arrange — collect console errors from the iframe
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Act — navigate and wait for code to run
    await page.goto("/en/11-di");
    await waitForPlayground(page);
    const iframe = previewFrame(page);
    await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
      timeout: LOAD_TIMEOUT,
    });
    // Give the iframe modules time to execute
    await page.waitForTimeout(3000);

    // Assert — no errors should have been logged
    const serviceErrors = errors.filter(
      (e) => e.includes("is not registered") || e.includes("ServiceRegistry"),
    );
    expect(serviceErrors).toHaveLength(0);
  });
});

// ── Multi-tab example (10-forms) ─────────────────────
test.describe("Multi-tab playground (forms)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/10-forms");
    await waitForPlayground(page);
  });

  test("should expose initializer-driven form architecture in the editor tabs", async ({
    page,
  }) => {
    const tabs = page.locator("code-playground .file-tab");

    await expect(tabs).toHaveCount(6);
    await expect(tabs.nth(0)).toContainText("forms.example.ts");
    await expect(tabs.nth(1)).toContainText("forms.rules-service.ts");
    await expect(tabs.nth(2)).toContainText("forms.initializer.ts");
    await expect(tabs.nth(3)).toContainText("forms.styles.css");
    await expect(tabs.nth(4)).toContainText("main.ts");
    await expect(tabs.nth(5)).toContainText("index.html");
  });

  test("should render visible validation hints hydrated from service rules", async ({
    page,
  }) => {
    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect(frame.locator("forms-example h3")).toHaveText(
      "Forms & Rules",
    );
    await expect(
      frame.locator("text=A service provides validation rules"),
    ).toBeVisible();
    await expect(frame.locator("#usernameHint")).toHaveText(
      "Required. 3 to 20 characters.",
    );
    await expect(frame.locator("#emailHint")).toHaveText(
      "Required. Use an email like name@domain.com.",
    );
    await expect(frame.locator("#passwordHint")).toHaveText(
      "Required. 8 to 64 characters.",
    );
    await expect(frame.locator("#emailField")).toHaveAttribute("pattern", /@/);
    await expect(frame.locator('button[type="submit"]')).toBeDisabled();
    await frame.locator("#usernameField").fill("Ada");
    await frame.locator("#emailField").fill("bad-email");
    await frame.locator("#passwordField").fill("12345678");
    await expect(frame.locator('button[type="submit"]')).toBeDisabled();
    await frame.locator("#emailField").fill("ada@example.test");
    await expect(frame.locator('button[type="submit"]')).toBeEnabled();
  });
});

// ── Locale switching without remount ─────────────────
test.describe("Locale switching", () => {
  test("should apply the dark theme to the preview surface", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("pc-theme", "dark"));
    await page.goto("/en/10-forms");
    await waitForPlayground(page);

    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect
      .poll(
        () =>
          frame.evaluate(() => ({
            theme: document.documentElement.getAttribute("data-theme"),
            background: getComputedStyle(document.documentElement)
              .backgroundColor,
          })),
        { timeout: LOAD_TIMEOUT },
      )
      .toEqual({
        theme: "dark",
        background: "rgb(27, 36, 48)",
      });
  });

  test("should keep theme state in the shell and relabel it when the locale changes", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.removeItem("pc-theme"));
    await page.goto("/en/10-forms");
    await waitForPlayground(page);

    const shell = page.locator("playground-shell");
    const themeButton = page.locator("theme-switcher .theme-toggle");
    const themeButtonHandle = await themeButton.elementHandle();
    if (!themeButtonHandle) {
      throw new Error("Expected theme switcher control to be mounted");
    }

    await expect(themeButton).toContainText("Auto");
    await themeButton.click();
    await expect(themeButton).toContainText("Light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("language-switcher")).toHaveAttribute(
      "data-theme",
      "light",
    );
    await expect(page.locator("theme-switcher")).toHaveAttribute(
      "data-theme",
      "light",
    );

    await page.locator("language-switcher a").first().click();
    await page.waitForURL("**/es/10-forms");
    await waitForPlayground(page);

    expect(
      await shell.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot
            ?.querySelector("theme-switcher")
            ?.shadowRoot?.querySelector(".theme-toggle") === element,
        themeButtonHandle,
      ),
    ).toBe(true);
    await expect(themeButton).toContainText("Claro");
    await expect(themeButton).toHaveAttribute("title", "Tema: Claro");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("code-playground")).toHaveAttribute(
      "src",
      "/playground-examples/10-forms/es-light/forms.example.ts",
    );
  });

  test("should resolve a different example variant when the theme changes", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("pc-theme", "light"));
    await page.goto("/en/01-hello");
    await waitForPlayground(page);

    const themeButton = page.locator("theme-switcher .theme-toggle");
    const playground = page.locator("code-playground");
    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect(playground).toHaveAttribute(
      "src",
      "/playground-examples/01-hello/en-light/hello.example.ts",
    );
    await expect(frame.locator("hello-example p")).toHaveText(
      "Hello, Somebody!",
    );
    await expect(frame.locator("hello-example p")).toHaveCSS(
      "color",
      "rgb(37, 99, 235)",
    );

    await themeButton.click();
    await waitForPlayground(page);

    const frameAfter = await previewContentFrame(page);
    if (!frameAfter) {
      throw new Error("Expected preview iframe after theme switch");
    }

    await expect(themeButton).toContainText("Dark");
    await expect(playground).toHaveAttribute(
      "src",
      "/playground-examples/01-hello/en-dark/hello.example.ts",
    );
    await expect(frameAfter.locator("hello-example p")).toHaveText(
      "Hello, Somebody!",
    );
    await expect(frameAfter.locator("hello-example p")).toHaveCSS(
      "color",
      "rgb(147, 197, 253)",
    );
  });

  test("should keep tab-nav and code-playground mounted when only the locale changes", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/en/01-hello");
    await waitForPlayground(page);

    const shell = page.locator("playground-shell");
    const tabNav = page.locator("tab-nav");
    const playground = page.locator("code-playground");
    const iframe = previewFrame(page);
    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }
    const shellHandle = await shell.elementHandle();
    const tabNavHandle = await tabNav.elementHandle();
    const playgroundHandle = await playground.elementHandle();
    const iframeHandle = await iframe.elementHandle();
    if (!shellHandle || !tabNavHandle || !playgroundHandle || !iframeHandle) {
      throw new Error(
        "Expected playground-shell, tab-nav, code-playground and iframe to be mounted",
      );
    }

    await expect(page.locator("tab-nav .cat-label").first()).toHaveText(
      "BASICS",
    );
    await expect(page.locator("tab-nav .cat-label").nth(1)).toHaveText(
      "FRAMEWORK COMPONENTS",
    );
    await expect(page.locator("tab-nav .cat-label").nth(2)).toHaveText(
      "ARCHITECTURE",
    );
    await expect(page.locator("tab-nav .cat-label")).toHaveCount(3);
    await expect(page.locator("tab-nav pick-link").first()).toHaveText(
      "Hello World",
    );
    await expect(page.locator("tab-nav pick-link").nth(1)).toHaveText(
      "Reactive State",
    );
    await expect(
      page.locator("code-playground .actions button").nth(0),
    ).toContainText("Download");
    await expect(
      page.locator("code-playground .actions button").nth(1),
    ).toContainText("Run");
    await expect(
      page.locator("code-playground .actions button").nth(2),
    ).toContainText("Reset");
    await expect(page.locator("code-playground .result-bar .lbl")).toHaveText(
      "Result",
    );
    await expect(frame.locator("html")).toHaveAttribute("lang", "en");
    await expect(frame.locator("hello-example")).toHaveAttribute(
      "locale",
      "en",
    );
    await expect(frame.locator("hello-example p")).toHaveText(
      "Hello, Somebody!",
    );

    // Act
    await page.locator("language-switcher a").first().click();
    await page.waitForURL("**/es/01-hello");
    await waitForPlayground(page);
    const frameAfter = await previewContentFrame(page);
    if (!frameAfter) {
      throw new Error(
        "Expected preview iframe to be available after locale switch",
      );
    }

    // Assert
    expect(
      await page.evaluate(
        (element) => document.querySelector("playground-shell") === element,
        shellHandle,
      ),
    ).toBe(true);
    expect(
      await shellHandle.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot?.querySelector("tab-nav") === element,
        tabNavHandle,
      ),
    ).toBe(true);
    expect(
      await shellHandle.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot
            ?.querySelector("playground-route-view")
            ?.shadowRoot?.querySelector("code-playground") === element,
        playgroundHandle,
      ),
    ).toBe(true);
    expect(
      await shellHandle.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot
            ?.querySelector("playground-route-view")
            ?.shadowRoot?.querySelector("code-playground")
            ?.shadowRoot?.querySelector("#preview-frame") === element,
        iframeHandle,
      ),
    ).toBe(true);

    await expect(page.locator("tab-nav .cat-label").first()).toHaveText(
      "BÁSICOS",
    );
    await expect(page.locator("tab-nav .cat-label").nth(1)).toHaveText(
      "COMPONENTES DEL FRAMEWORK",
    );
    await expect(page.locator("tab-nav .cat-label").nth(2)).toHaveText(
      "ARQUITECTURA",
    );
    await expect(page.locator("tab-nav .cat-label")).toHaveCount(3);
    await expect(page.locator("tab-nav pick-link").first()).toHaveText(
      "Hola Mundo",
    );
    await expect(page.locator("tab-nav pick-link").nth(1)).toHaveText(
      "Estado Reactivo",
    );
    await expect(
      page.locator("code-playground .actions button").nth(0),
    ).toContainText("Descargar");
    await expect(
      page.locator("code-playground .actions button").nth(1),
    ).toContainText("Ejecutar");
    await expect(
      page.locator("code-playground .actions button").nth(2),
    ).toContainText("Reiniciar");
    await expect(page.locator("code-playground .result-bar .lbl")).toHaveText(
      "Resultado",
    );
    await expect(page.locator("tab-nav pick-link").first()).toHaveAttribute(
      "to",
      "/es/01-hello",
    );
    await expect(page.locator("tab-nav pick-link").first()).toHaveClass(
      /active/,
    );
    await expect(frameAfter.locator("html")).toHaveAttribute("lang", "es");
    await expect(frameAfter.locator("hello-example")).toHaveAttribute(
      "locale",
      "es",
    );
    await expect(frameAfter.locator("hello-example p")).toHaveText(
      "Hola, Alguien!",
    );
    await expect(frameAfter.locator("hello-example p")).toHaveCSS(
      "color",
      "rgb(37, 99, 235)",
    );
  });

  test("should keep playground-shell and code-playground mounted when switching examples in the same locale", async ({
    page,
  }) => {
    await page.goto("/en/01-hello");
    await waitForPlayground(page);

    const shell = page.locator("playground-shell");
    const playground = page.locator("code-playground");
    const iframe = previewFrame(page);
    const shellHandle = await shell.elementHandle();
    const playgroundHandle = await playground.elementHandle();
    const iframeHandle = await iframe.elementHandle();
    if (!shellHandle || !playgroundHandle || !iframeHandle) {
      throw new Error(
        "Expected playground-shell, code-playground and iframe to be mounted",
      );
    }

    await expect(
      page.locator("code-playground .file-tab").first(),
    ).toContainText("hello.example.ts");

    await page.locator("tab-nav pick-link").nth(1).click();
    await page.waitForURL("**/en/02-counter");
    await waitForPlayground(page);

    const frameAfter = await previewContentFrame(page);
    if (!frameAfter) {
      throw new Error("Expected preview iframe after example switch");
    }

    expect(
      await page.evaluate(
        (element) => document.querySelector("playground-shell") === element,
        shellHandle,
      ),
    ).toBe(true);
    expect(
      await shellHandle.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot
            ?.querySelector("playground-route-view")
            ?.shadowRoot?.querySelector("code-playground") === element,
        playgroundHandle,
      ),
    ).toBe(true);
    expect(
      await shellHandle.evaluate(
        (shellElement, element) =>
          shellElement.shadowRoot
            ?.querySelector("playground-route-view")
            ?.shadowRoot?.querySelector("code-playground")
            ?.shadowRoot?.querySelector("#preview-frame") === element,
        iframeHandle,
      ),
    ).toBe(true);

    await expect(
      page.locator("code-playground .file-tab").first(),
    ).toContainText("counter.example.ts");
    await expect(page.locator("code-playground .file-tab")).toHaveCount(3);
    await expect(
      page.locator("code-playground .file-tab").nth(1),
    ).toContainText("counter.styles.css");
    await expect(
      page.locator("code-playground .file-tab .file-icon").nth(1),
    ).toHaveText("CSS");
    await expect(frameAfter.locator("html")).toHaveAttribute("lang", "en");
    await expect(frameAfter.locator("counter-example")).toHaveAttribute(
      "locale",
      "en",
    );
    await expect(frameAfter.locator("counter-example p")).toHaveText(
      "Counter: 0",
    );
    await expect(
      frameAfter.locator("counter-example button").nth(1),
    ).toHaveText("Reset");
  });

  test("should update the counter through buttons handled with @Listen", async ({
    page,
  }) => {
    await page.goto("/en/02-counter");
    await waitForPlayground(page);

    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    const counter = frame.locator("counter-example p");
    const buttons = frame.locator("counter-example button");

    await expect(counter).toHaveText("Counter: 0");
    await buttons.nth(2).click();
    await expect(counter).toHaveText("Counter: 1");
    await buttons.nth(0).click();
    await expect(counter).toHaveText("Counter: 0");
    await buttons.nth(2).click();
    await buttons.nth(2).click();
    await expect(counter).toHaveText("Counter: 2");
    await buttons.nth(1).click();
    await expect(counter).toHaveText("Counter: 0");
  });

  test("should keep the preview surface dark while the next example is loading", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("pc-theme", "dark"));
    await page.goto("/en/01-hello");
    await waitForPlayground(page);

    let releaseRoute: (() => void) | null = null;
    await page.route(
      "**/playground-examples/**/counter.tabs.json",
      async (route) => {
        await new Promise<void>((resolve) => {
          releaseRoute = resolve;
        });
        await route.continue();
      },
    );

    await page.locator("tab-nav pick-link").nth(1).click();
    await page.waitForURL("**/en/02-counter");

    await expect
      .poll(
        async () => {
          const srcdoc = await previewFrame(page).getAttribute("srcdoc");
          return {
            theme: srcdoc?.match(/<html[^>]*data-theme="([^"]+)"/)?.[1] ?? null,
            hasDarkBackground: srcdoc?.includes("background: #1b2430") ?? false,
          };
        },
        { timeout: LOAD_TIMEOUT },
      )
      .toEqual({
        theme: "dark",
        hasDarkBackground: true,
      });

    releaseRoute?.();
    await waitForPlayground(page);
  });

  test("should replace removed Lifecycle routes with the canonical fallback example", async ({
    page,
  }) => {
    await page.goto("/en/10-lifecycle");
    await page.waitForURL("**/en/01-hello");
    await waitForPlayground(page);

    await expect(page.locator("tab-nav .cat-label")).toHaveCount(3);
    await expect(page.locator("tab-nav pick-link").first()).toHaveText(
      "Hello World",
    );
    await expect(
      page.locator("code-playground .file-tab").first(),
    ).toContainText("hello.example.ts");
  });

  test("should load the Spanish API variant and discard preview state on locale change", async ({
    page,
  }) => {
    await page.route("https://jsonplaceholder.typicode.com/users", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Ada Lovelace",
            username: "adal",
            email: "ada@example.com",
          },
        ]),
      }),
    );

    await page.route("https://dog.ceo/api/breeds/image/random/6", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: Array.from({ length: 6 }, (_, index) => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#dbeafe"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14">Dog ${index + 1}</text></svg>`;
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          }),
        }),
      }),
    );

    await page.goto("/en/12-api");
    await waitForPlayground(page);

    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect(frame.locator("api-example h3")).toHaveText("API Integration");
    await expect(frame.locator("text=Ada Lovelace")).toBeVisible();

    const previewToken = await frame.evaluate(() => {
      const current = (window as Window & { __pg_api_token?: string })
        .__pg_api_token;
      if (current) {
        return current;
      }

      const next = String(Math.random());
      (window as Window & { __pg_api_token?: string }).__pg_api_token = next;
      return next;
    });

    await page.locator("language-switcher a").first().click();
    await page.waitForURL("**/es/12-api");
    await waitForPlayground(page);

    const frameAfter = await previewContentFrame(page);
    if (!frameAfter) {
      throw new Error("Expected preview iframe after locale switch");
    }

    await expect(frameAfter.locator("html")).toHaveAttribute("lang", "es");
    await expect(frameAfter.locator("api-example h3")).toHaveText(
      "Integración con API",
    );
    await expect(page.locator("code-playground")).toHaveAttribute(
      "src",
      /\/playground-examples\/12-api\/es-(light|dark)\/api\.example\.ts/,
    );
    await expect(frameAfter.locator("api-example img")).toHaveCount(0);
    await expect(frameAfter.locator("text=Ada Lovelace")).toBeVisible();
    await expect(
      frameAfter.locator('api-example button:has-text("Cargar imágenes")'),
    ).toBeVisible();
    expect(
      await frameAfter.evaluate(
        () => (window as Window & { __pg_api_token?: string }).__pg_api_token,
      ),
    ).not.toBe(previewToken);
  });

  test("should load the Spanish Pick For variant when the locale changes", async ({
    page,
  }) => {
    await page.goto("/en/09-pick-for");
    await waitForPlayground(page);

    const frame = await previewContentFrame(page);
    if (!frame) {
      throw new Error("Expected preview iframe to be available");
    }

    await expect(frame.locator("pick-for-example h3")).toHaveText(
      "Pick For",
    );
    await expect(frame.locator("text=Define the component")).toBeVisible();

    await page.locator("language-switcher a").first().click();
    await page.waitForURL("**/es/09-pick-for");
    await waitForPlayground(page);

    const frameAfter = await previewContentFrame(page);
    if (!frameAfter) {
      throw new Error("Expected preview iframe after locale switch");
    }

    await expect(frameAfter.locator("pick-for-example")).toHaveAttribute(
      "locale",
      "es",
    );
    await expect(frameAfter.locator("pick-for-example h3")).toHaveText(
      "Pick For",
    );
    await expect(page.locator("code-playground")).toHaveAttribute(
      "src",
      /\/playground-examples\/09-pick-for\/es-(light|dark)\/pick-for\.example\.ts/,
    );
    await expect(
      frameAfter.locator("pick-for-example article"),
    ).toHaveCount(3);
    await expect(
      frameAfter.locator("text=Definir el componente"),
    ).toBeVisible();
    await expect(
      frameAfter.locator("text=Mantener DOM estable con key"),
    ).toBeVisible();
    await expect(
      frameAfter.locator("pick-for-example article").first(),
    ).toContainText("#0");
    await expect(
      frameAfter.locator("pick-for-example article").last(),
    ).toContainText("pendiente");
  });
});

// ── Multiple examples smoke test ─────────────────────
test.describe("All examples smoke test", () => {
  const examples = PLAYGROUND_EXAMPLES.map((example) => ({
    path: buildExamplePath("en", example.id),
    name: example.id.replace(/^\d+-/, ""),
    minTabs: example.minTabs,
  }));

  for (const ex of examples) {
    test(`${ex.name} — should load tabs and set srcdoc`, async ({ page }) => {
      // Arrange
      await page.goto(ex.path);

      // Act
      await waitForPlayground(page);

      // Assert — correct number of tabs
      const tabs = page.locator("code-playground .file-tab");
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(ex.minTabs);

      // Assert — srcdoc is set (code was transpiled and injected)
      const iframe = previewFrame(page);
      await expect(iframe).toHaveAttribute("srcdoc", /.+/, {
        timeout: LOAD_TIMEOUT,
      });

      // Assert — no transpilation error visible
      const errorOutput = page.locator("code-playground .error-output");
      await expect(errorOutput).toHaveCount(0);
    });
  }
});
