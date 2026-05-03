import { expect, test } from "@playwright/test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveStaticAssetPath } from "../../support/resolve-static-asset-path.js";

test.describe("resolveStaticAssetPath", () => {
  test("should resolve assets under the configured root directory", () => {
    const rootDirectory = createFixtureRoot();

    try {
      const result = resolveStaticAssetPath(
        rootDirectory,
        "/public/app.js",
        "public/index.html",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.absolutePath).toBe(join(rootDirectory, "public/app.js"));
      }
    } finally {
      rmSync(rootDirectory, { recursive: true, force: true });
    }
  });

  test("should resolve the default asset for the root request", () => {
    const rootDirectory = createFixtureRoot();

    try {
      const result = resolveStaticAssetPath(
        rootDirectory,
        "/",
        "public/index.html",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.absolutePath).toBe(
          join(rootDirectory, "public/index.html"),
        );
      }
    } finally {
      rmSync(rootDirectory, { recursive: true, force: true });
    }
  });

  test("should return 404 for missing files inside the root", () => {
    const rootDirectory = createFixtureRoot();

    try {
      const result = resolveStaticAssetPath(
        rootDirectory,
        "/public/missing.js",
        "public/index.html",
      );

      expect(result).toEqual({ ok: false, statusCode: 404 });
    } finally {
      rmSync(rootDirectory, { recursive: true, force: true });
    }
  });

  test("should return 403 for traversal, encoded traversal and absolute paths", () => {
    const rootDirectory = createFixtureRoot();
    const blockedPaths = [
      "/../secret.txt",
      "/public/%2e%2e/secret.txt",
      "/public/%252e%252e/secret.txt",
      "/%2fetc/passwd",
      "/C:/Windows/win.ini",
      "/public\\secret.txt",
      "/public/app.js%00.png",
    ];

    try {
      for (const blockedPath of blockedPaths) {
        expect(
          resolveStaticAssetPath(
            rootDirectory,
            blockedPath,
            "public/index.html",
          ),
        ).toEqual({ ok: false, statusCode: 403 });
      }
    } finally {
      rmSync(rootDirectory, { recursive: true, force: true });
    }
  });
});

function createFixtureRoot(): string {
  const rootDirectory = mkdtempSync(join(tmpdir(), "pick-static-assets-"));
  writeFileSync(join(rootDirectory, "secret.txt"), "secret");
  createPublicFiles(rootDirectory);
  return rootDirectory;
}

function createPublicFiles(rootDirectory: string): void {
  const publicDirectory = join(rootDirectory, "public");
  mkdirSync(publicDirectory, { recursive: true });
  writeFileSync(join(publicDirectory, "index.html"), "<!doctype html>");
  writeFileSync(join(publicDirectory, "app.js"), "export {};");
}
