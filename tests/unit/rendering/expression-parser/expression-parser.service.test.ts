import { test, expect } from "@playwright/test";
import { ExpressionParserService } from "../../../../src/rendering/expression-parser/expression-parser.service.js";
import type { ParsedExpression } from "../../../../src/rendering/expression-parser/types.js";

/**
 * Tests for ExpressionParserService responsibility.
 *
 * Covers caching hit path, parsing + dependency extraction path, and input validation.
 */

test.describe("ExpressionParserService", () => {
  test("should return same instance on repeated parse of same expression", () => {
    // Arrange
    const service = new ExpressionParserService();

    // Act
    const first = service.parse("x + 2");
    const second = service.parse("x + 2");

    // Assert — same reference proves caching is active
    expect(first).toBe(second);
  });

  test("should parse expression and extract dependencies", () => {
    // Arrange
    const service = new ExpressionParserService();

    // Act
    const result: ParsedExpression = service.parse("x + 2");

    // Assert
    expect(result.dependencies).toEqual(["x"]);
    expect(result.originalExpression).toBe("x + 2");
    expect((result.ast as any).type).toBe("BinaryExpression");
  });

  test("should extract multiple unique dependencies", () => {
    // Arrange
    const service = new ExpressionParserService();

    // Act
    const result = service.parse("x + y + x");

    // Assert — duplicates removed
    expect(result.dependencies).toEqual(["x", "y"]);
  });

  test("should throw when expression is empty", () => {
    // Arrange
    const service = new ExpressionParserService();

    // Act & Assert
    expect(() => service.parse("")).toThrow("Expression string is required");
  });

  test("should throw when expression is null", () => {
    // Arrange
    const service = new ExpressionParserService();

    // Act & Assert
    expect(() => service.parse(null as any)).toThrow(
      "Expression string is required",
    );
  });
});
