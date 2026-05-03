import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { AddressInfo } from "node:net";
import { resolveStaticAssetPath } from "../support/resolve-static-asset-path.js";

const repositoryRoot = process.cwd();
const defaultBrowserFixturePath =
  "tests/fixtures/browser/browser-ready-smoke.html";
const mimeTypes: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".mjs": "application/javascript",
  ".svg": "image/svg+xml",
};

function createStaticRepositoryServer(): Server {
  return createServer((request, response) => {
    const requestPath = getRequestPath(request.url ?? "/");
    if (requestPath === null) {
      response.writeHead(403, { "Content-Type": "text/plain" });
      response.end("403 Forbidden");
      return;
    }

    const assetPath = resolveStaticAssetPath(
      repositoryRoot,
      requestPath,
      defaultBrowserFixturePath,
    );

    if (!assetPath.ok) {
      response.writeHead(assetPath.statusCode, {
        "Content-Type": "text/plain",
      });
      response.end(
        assetPath.statusCode === 403 ? "403 Forbidden" : "404 Not Found",
      );
      return;
    }

    const contentType =
      mimeTypes[extname(assetPath.absolutePath)] ?? "application/octet-stream";

    try {
      const fileContents = readFileSync(assetPath.absolutePath);
      response.writeHead(200, { "Content-Type": contentType });
      response.end(fileContents);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("404 Not Found");
    }
  });
}

function getRequestPath(requestUrl: string): string | null {
  try {
    return new URL(requestUrl, "http://127.0.0.1").pathname;
  } catch {
    return null;
  }
}

test.describe("Browser-ready distribution", () => {
  let server: Server;
  let baseUrl: string;

  test.beforeAll(async () => {
    // Arrange
    server = createStaticRepositoryServer();

    // Act
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    // Act
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  test("should import the published browser-ready artifact from plain HTML", async ({
    page,
  }) => {
    // Arrange
    const smokeUrl = `${baseUrl}/tests/fixtures/browser/browser-ready-smoke.html`;

    // Act
    await page.goto(smokeUrl);

    // Assert
    await expect(page.locator("#status")).toHaveText("ready");
  });

  test("should project Pick component children through native named and default slots", async ({
    page,
  }) => {
    // Arrange
    const slotUrl = `${baseUrl}/tests/fixtures/browser/slot-projection.html`;

    // Act
    await page.goto(slotUrl);

    // Assert
    await expect(page.locator("#status")).toHaveText("ready");

    const projection = await page.evaluate(() => {
      const shell = document.querySelector("pick-slot-shell");
      const headerSlot = shell?.shadowRoot?.querySelector(
        'slot[name="header"]',
      ) as HTMLSlotElement | null;
      const defaultSlot = shell?.shadowRoot?.querySelector(
        "slot:not([name])",
      ) as HTMLSlotElement | null;
      const headerChild = headerSlot?.assignedElements()[0] as HTMLElement;
      const bodyChild = defaultSlot?.assignedElements()[0] as HTMLElement;

      return {
        shellHasShadowRoot: Boolean(shell?.shadowRoot),
        headerAssignedTag: headerChild?.tagName.toLowerCase() ?? null,
        headerAssignedSlot: headerChild?.getAttribute("slot") ?? null,
        headerText:
          headerChild?.shadowRoot?.querySelector("#title-output")
            ?.textContent ?? null,
        bodyAssignedTag: bodyChild?.tagName.toLowerCase() ?? null,
        bodyAssignedSlot: bodyChild?.getAttribute("slot") ?? null,
        bodyText:
          bodyChild?.shadowRoot?.querySelector("#body-output")?.textContent ??
          null,
      };
    });

    expect(projection).toEqual({
      shellHasShadowRoot: true,
      headerAssignedTag: "pick-slot-title",
      headerAssignedSlot: "header",
      headerText: "Projected Header",
      bodyAssignedTag: "pick-slot-body",
      bodyAssignedSlot: null,
      bodyText: "Projected Body",
    });
  });
});
