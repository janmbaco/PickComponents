import { expect, test } from "@playwright/test";
import { Window } from "happy-dom";
import { BrowserPlaygroundPreviewPort } from "../../../examples/src/features/playground/ports/playground-preview.port.js";

test.describe("BrowserPlaygroundPreviewPort", () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;

  test.beforeEach(() => {
    (globalThis as any).document = new Window().document;
    globalThis.fetch = async () =>
      ({
        text: async () => "export {};",
      }) as Response;
  });

  test.afterEach(() => {
    (globalThis as any).document = originalDocument;
    globalThis.fetch = originalFetch;
  });

  test("should rewrite local imports whose filenames contain regex metacharacters", async () => {
    const previewPort = new BrowserPlaygroundPreviewPort();
    const localFile = "widget.[demo]+(v1)?.ts";
    const modules = new Map<string, string>([
      ["entry.ts", `import widget from "./${localFile}";\nwidget();`],
      [localFile, "export default function widget() {}"],
    ]);

    const srcdoc = await previewPort.buildMultiSrcdoc(
      modules,
      new Map(),
      "entry.ts",
      "<demo-widget></demo-widget>",
      "",
      "en",
      "light",
      false,
    );

    expect(srcdoc).toContain(`from "__pg__/${localFile}"`);
    expect(srcdoc).not.toContain(`from "./${localFile}"`);
  });
});
