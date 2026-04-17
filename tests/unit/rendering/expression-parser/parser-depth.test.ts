import { test, expect } from "@playwright/test";
import { ExpressionParserMother } from "../../../fixtures/expression-parser.mother.js";

/**
 * Tests for Parser depth-limit enforcement.
 *
 * Covers parenthesized nesting depth and ternary chain depth beyond MAX_DEPTH (32).
 */

test.describe("Parser — depth limit", () => {
  test("should parse expression within depth limit (32 levels of parens)", () => {
    // Arrange
    const expression = "(".repeat(32) + "x" + ")".repeat(32);

    // Act & Assert
    expect(() => ExpressionParserMother.parse(expression)).not.toThrow();
  });

  test("should throw when parenthesized nesting depth exceeds 32", () => {
    // Arrange
    const expression = "(".repeat(33) + "x" + ")".repeat(33);

    // Act & Assert
    expect(() => ExpressionParserMother.parse(expression)).toThrow(
      "Expression nesting depth exceeds maximum of 32",
    );
  });

  test("should parse ternary chain within depth limit", () => {
    // Arrange
    // 32 nested ternaries: a ? b : a ? b : a ? b : ... x
    const parts = Array.from({ length: 32 }, () => "a ? b :").join(" ");
    const expression = `${parts} x`;

    // Act & Assert
    expect(() => ExpressionParserMother.parse(expression)).not.toThrow();
  });

  test("should throw when ternary chain depth exceeds 32", () => {
    // Arrange
    // 33 nested ternaries
    const parts = Array.from({ length: 33 }, () => "a ? b :").join(" ");
    const expression = `${parts} x`;

    // Act & Assert
    expect(() => ExpressionParserMother.parse(expression)).toThrow(
      "Expression nesting depth exceeds maximum of 32",
    );
  });
});
