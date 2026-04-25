import { test, expect } from "@playwright/test";
import { PLAYGROUND_EXAMPLES } from "../../../examples/src/features/examples-catalog/models/example-catalog.js";
import {
  renderDocument,
  renderPublicStyles,
} from "../../../scripts/prerender-examples.mjs";

const helloExample = PLAYGROUND_EXAMPLES.find(
  (example) => example.id === "01-hello",
);

if (!helloExample) {
  throw new Error("Expected 01-hello example to exist for prerender tests");
}

test.describe("prerender examples script", () => {
  test("should render a snapshot-ready example page when prerendering 01-hello", async () => {
    // Arrange
    const html = await renderDocument({
      locale: "es",
      path: "/es/01-hello",
      example: helloExample,
    });

    // Act & Assert
    expect(html).toContain("<html lang=\"es\">");
    expect(html).not.toContain("<html lang=\"es\" data-theme=");
    expect(html).toMatchSnapshot("prerender-es-01-hello.html");
  });

  test("should expose prefers-color-scheme and shell control tokens in public styles", () => {
    // Arrange
    const styles = renderPublicStyles();

    // Act & Assert
    expect(styles).toContain("@media (prefers-color-scheme: light)");
    expect(styles).toContain("--pg-shell-control-bg: #111827;");
    expect(styles).toContain("--pg-shell-control-bg: #f5f8fc;");
    expect(styles).toContain(":root:not([data-theme=\"dark\"])");
  });
});