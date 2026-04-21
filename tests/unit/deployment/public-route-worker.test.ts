import { expect, test } from "@playwright/test";
import {
  buildPublicRouteCandidates,
  handlePickPublicRouteRequest,
} from "../../../deploy/cloudflare/public-route-worker.mjs";

test.describe("public route worker", () => {
  test("resolves clean public routes to prerendered index files", async () => {
    // Arrange
    const request = new Request("https://pickcomponents.com/es/01-hello", {
      headers: { Accept: "text/html" },
    });
    const env = createAssetEnv({
      "/es/01-hello/index.html": "<h1>Hola Mundo</h1>",
      "/index.html": "<playground-shell></playground-shell>",
    });

    // Act
    const response = await handlePickPublicRouteRequest(request, env);

    // Assert
    await expect(response.text()).resolves.toContain("Hola Mundo");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(response.headers.get("X-Pick-Delivery")).toBe("public-html");
  });

  test("does not branch document delivery by crawler user agent", async () => {
    // Arrange
    const env = createAssetEnv({
      "/es/01-hello/index.html": "<h1>Hola Mundo</h1>",
      "/index.html": "<playground-shell></playground-shell>",
    });

    // Act
    const browserResponse = await handlePickPublicRouteRequest(
      new Request("https://pickcomponents.com/es/01-hello", {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      env,
    );
    const crawlerResponse = await handlePickPublicRouteRequest(
      new Request("https://pickcomponents.com/es/01-hello", {
        headers: { "User-Agent": "Googlebot/2.1" },
      }),
      env,
    );

    // Assert
    await expect(browserResponse.text()).resolves.toBe("<h1>Hola Mundo</h1>");
    await expect(crawlerResponse.text()).resolves.toBe("<h1>Hola Mundo</h1>");
  });

  test("falls back to the SPA shell only when a clean route has no public page", async () => {
    // Arrange
    const request = new Request("https://pickcomponents.com/internal/tool");
    const env = createAssetEnv({
      "/index.html": "<playground-shell></playground-shell>",
    });

    // Act
    const response = await handlePickPublicRouteRequest(request, env);

    // Assert
    await expect(response.text()).resolves.toContain("playground-shell");
    expect(response.headers.get("X-Pick-Delivery")).toBe("spa-fallback");
  });

  test("serves static assets without using the SPA fallback", async () => {
    // Arrange
    const request = new Request("https://pickcomponents.com/missing.js");
    const env = createAssetEnv({
      "/index.html": "<playground-shell></playground-shell>",
    });

    // Act
    const response = await handlePickPublicRouteRequest(request, env);

    // Assert
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("404 Not Found");
  });

  test("uses route candidates that match file-first static hosting", () => {
    // Arrange
    const routePath = "/es/01-hello";
    const assetPath = "/bundle.js";
    const homePath = "/";

    // Act & Assert
    expect(buildPublicRouteCandidates(routePath)).toEqual([
      "/es/01-hello/index.html",
      "/es/01-hello",
      "/index.html",
    ]);
    expect(buildPublicRouteCandidates(assetPath)).toEqual(["/bundle.js"]);
    expect(buildPublicRouteCandidates(homePath)).toEqual(["/index.html"]);
  });
});

function createAssetEnv(files: Record<string, string>) {
  return {
    ASSETS: {
      async fetch(request: Request) {
        const path = new URL(request.url).pathname;
        const body = files[path];

        if (body === undefined) {
          return new Response("Asset not found", { status: 404 });
        }

        return new Response(request.method === "HEAD" ? null : body, {
          status: 200,
          headers: {
            "Content-Type": path.endsWith(".html")
              ? "text/html; charset=utf-8"
              : "application/octet-stream",
          },
        });
      },
    },
  };
}
