import { test, expect } from "@playwright/test";
import {
  inferPlaygroundBasePath,
  normalizePlaygroundBasePath,
  stripPlaygroundBasePath,
  withPlaygroundBasePath,
} from "../../../examples/src/features/routing/models/playground-public-path.js";
import {
  buildExamplePath,
  exampleIdFromPlaygroundPath,
  hasPlaygroundLocalePrefix,
  localeFromPlaygroundPath,
} from "../../../examples/src/features/routing/models/playground-routes.js";

test.describe("playground public path helpers", () => {
  test("normalizes optional deployment base paths", () => {
    expect(normalizePlaygroundBasePath("")).toBe("");
    expect(normalizePlaygroundBasePath("/")).toBe("");
    expect(normalizePlaygroundBasePath("PickComponents/")).toBe(
      "/PickComponents",
    );
  });

  test("adds and strips the deployment base path", () => {
    expect(withPlaygroundBasePath("/bundle.js", "/PickComponents")).toBe(
      "/PickComponents/bundle.js",
    );
    expect(withPlaygroundBasePath("/es", "/PickComponents")).toBe(
      "/PickComponents/es",
    );
    expect(stripPlaygroundBasePath("/PickComponents/es/01-hello", "/PickComponents")).toBe(
      "/es/01-hello",
    );
  });

  test("infers a project pages base path from public URLs", () => {
    expect(inferPlaygroundBasePath("/PickComponents/es/01-hello")).toBe(
      "/PickComponents",
    );
    expect(inferPlaygroundBasePath("/es/01-hello")).toBe("");
  });

  test("resolves playground routes under a project pages base path", () => {
    (globalThis as { __PICK_PLAYGROUND_BASE_PATH__?: string })
      .__PICK_PLAYGROUND_BASE_PATH__ = "/PickComponents";

    try {
      expect(hasPlaygroundLocalePrefix("/PickComponents/en/02-counter")).toBe(
        true,
      );
      expect(localeFromPlaygroundPath("/PickComponents/en/02-counter")).toBe(
        "en",
      );
      expect(
        exampleIdFromPlaygroundPath("/PickComponents/en/02-counter"),
      ).toBe("02-counter");
      expect(buildExamplePath("en", "02-counter")).toBe(
        "/PickComponents/en/02-counter",
      );
    } finally {
      delete (globalThis as { __PICK_PLAYGROUND_BASE_PATH__?: string })
        .__PICK_PLAYGROUND_BASE_PATH__;
    }
  });
});

