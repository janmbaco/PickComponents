import { test, expect } from "@playwright/test";
import { CompositeTokenExtractor } from "../../../../src/rendering/templates/composite-token-extractor.js";
import { DelimitedTokenExtractor } from "../../../../src/rendering/templates/delimited-token-extractor.js";

/**
 * Tests for CompositeTokenExtractor (string-only aggregation).
 */
test.describe("CompositeTokenExtractor", () => {
  test("should aggregate tokens from multiple extractors", () => {
    // Arrange
    const mustache = new DelimitedTokenExtractor("{{", "}}", "binding");
    const dollar = new DelimitedTokenExtractor("${", "}", "binding");
    const extractor = new CompositeTokenExtractor([mustache, dollar]);
    const template = "Hello {{user}} owes ${amount}";

    // Act
    const tokens = extractor.extract(template);

    // Assert
    expect(tokens).toHaveLength(2);
    expect(tokens.map((t) => t.value).sort()).toEqual(["amount", "user"]);
  });

  test("should throw when created without extractors", () => {
    // Arrange & Act & Assert
    expect(() => new CompositeTokenExtractor([])).toThrow(
      "At least one extractor is required",
    );
  });
});
