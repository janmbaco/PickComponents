import { test, expect } from "@playwright/test";
import { DelimitedTokenExtractor } from "../../../../src/rendering/templates/delimited-token-extractor.js";

/**
 * Tests for DelimitedTokenExtractor (string-only).
 */
test.describe("DelimitedTokenExtractor", () => {
  test("should extract single token and trim value", () => {
    // Arrange
    const extractor = new DelimitedTokenExtractor("{{", "}}", "binding");
    const template = "Hello {{ name }}!";

    // Act
    const tokens = extractor.extract(template);

    // Assert
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("binding");
    expect(tokens[0].value).toBe("name");
    expect(tokens[0].raw).toBe("{{ name }}");
  });

  test("should extract multiple tokens with positions", () => {
    // Arrange
    const extractor = new DelimitedTokenExtractor("{{", "}}", "binding");
    const template = "A {{first}} B {{second}} C";

    // Act
    const tokens = extractor.extract(template);

    // Assert
    expect(tokens).toHaveLength(2);
    expect(tokens[0].value).toBe("first");
    expect(tokens[0].start).toBe(template.indexOf("{{first}}"));
    expect(tokens[0].end).toBe(tokens[0].start + "{{first}}".length);
    expect(tokens[1].value).toBe("second");
  });

  test("should ignore incomplete delimiters", () => {
    // Arrange
    const extractor = new DelimitedTokenExtractor("{{", "}}", "binding");
    const template = "Hello {{name";

    // Act
    const tokens = extractor.extract(template);

    // Assert
    expect(tokens).toHaveLength(0);
  });

  test("should return empty array for empty string", () => {
    // Arrange
    const extractor = new DelimitedTokenExtractor("{{", "}}", "binding");

    // Act
    const tokens = extractor.extract("");

    // Assert
    expect(tokens).toHaveLength(0);
  });

  test("should support alternative delimiters", () => {
    // Arrange
    const extractor = new DelimitedTokenExtractor("${", "}", "binding");
    const template = "Total: ${amount}";

    // Act
    const tokens = extractor.extract(template);

    // Assert
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe("amount");
  });
});
