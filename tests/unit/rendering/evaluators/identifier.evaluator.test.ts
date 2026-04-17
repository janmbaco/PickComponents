import { test, expect } from "@playwright/test";
import { IdentifierEvaluator } from "../../../../src/rendering/expression-parser/evaluators/identifier.evaluator.js";
import type { IdentifierNode } from "../../../../src/rendering/expression-parser/types.js";

/**
 * Tests for IdentifierEvaluator responsibility.
 *
 * Tests cover:
 * - Resolving identifiers from scope
 * - Returning undefined for missing identifiers
 * - Error when node/scope is null
 */

test.describe("IdentifierEvaluator", () => {
  let evaluator: IdentifierEvaluator;
  let scope: Record<string, any>;

  test.beforeEach(() => {
    // Arrange
    evaluator = new IdentifierEvaluator();
    scope = { x: 10, name: "Alice" };
  });

  test("should resolve number identifier from scope", () => {
    // Arrange
    const node: IdentifierNode = { type: "Identifier", name: "x" };

    // Act
    const result = evaluator.evaluate(node, scope, {} as any);

    // Assert
    expect(result).toBe(10);
  });

  test("should resolve string identifier from scope", () => {
    // Arrange
    const node: IdentifierNode = { type: "Identifier", name: "name" };

    // Act
    const result = evaluator.evaluate(node, scope, {} as any);

    // Assert
    expect(result).toBe("Alice");
  });

  test("should return undefined for missing identifier", () => {
    // Arrange
    const node: IdentifierNode = { type: "Identifier", name: "missing" };

    // Act
    const result = evaluator.evaluate(node, scope, {} as any);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should throw error when node is null", () => {
    // Act & Assert
    expect(() => evaluator.evaluate(null as any, scope, {} as any)).toThrow(
      "Node is required",
    );
  });

  test("should throw error when scope is null", () => {
    // Arrange
    const node: IdentifierNode = { type: "Identifier", name: "x" };

    // Act & Assert
    expect(() => evaluator.evaluate(node, null as any, {} as any)).toThrow(
      "Scope is required",
    );
  });
});
