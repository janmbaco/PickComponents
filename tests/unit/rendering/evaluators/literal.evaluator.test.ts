import { test, expect } from "@playwright/test";
import { LiteralEvaluator } from "../../../../src/rendering/expression-parser/evaluators/literal.evaluator.js";
import type { LiteralNode } from "../../../../src/rendering/expression-parser/types.js";

/**
 * Tests for LiteralEvaluator responsibility.
 *
 * Tests cover:
 * - String, number, boolean, null literal values
 * - Error when node is null
 */

test.describe("LiteralEvaluator", () => {
  let evaluator: LiteralEvaluator;

  test.beforeEach(() => {
    // Arrange
    evaluator = new LiteralEvaluator();
  });

  test("should return string literal value", () => {
    // Arrange
    const node: LiteralNode = { type: "Literal", value: "hello" };

    // Act
    const result = evaluator.evaluate(node, {}, {} as any);

    // Assert
    expect(result).toBe("hello");
  });

  test("should return number literal value", () => {
    // Arrange
    const node: LiteralNode = { type: "Literal", value: 42 };

    // Act
    const result = evaluator.evaluate(node, {}, {} as any);

    // Assert
    expect(result).toBe(42);
  });

  test("should return boolean true literal value", () => {
    // Arrange
    const node: LiteralNode = { type: "Literal", value: true };

    // Act
    const result = evaluator.evaluate(node, {}, {} as any);

    // Assert
    expect(result).toBe(true);
  });

  test("should return null literal value", () => {
    // Arrange
    const node: LiteralNode = { type: "Literal", value: null };

    // Act
    const result = evaluator.evaluate(node, {}, {} as any);

    // Assert
    expect(result).toBeNull();
  });

  test("should throw error when node is null", () => {
    // Act & Assert
    expect(() => evaluator.evaluate(null as any, {}, {} as any)).toThrow(
      "Node is required",
    );
  });
});
