import { test, expect } from "@playwright/test";
import { UnaryExpressionEvaluator } from "../../../../src/rendering/expression-parser/evaluators/unary.evaluator.js";
import type { UnaryExpressionNode } from "../../../../src/rendering/expression-parser/types.js";
import type { IEvaluator } from "../../../../src/rendering/expression-parser/interfaces.js";
import { createSequencedEvaluator } from "../../../fixtures/mock-evaluator";

/**
 * Tests for UnaryExpressionEvaluator responsibility.
 *
 * Tests cover:
 * - Logical negation (!)
 * - Numeric negation (-)
 * - Numeric coercion (+)
 * - Unknown operator error
 */

test.describe("UnaryExpressionEvaluator", () => {
  let evaluator: UnaryExpressionEvaluator;
  let mockScope: Record<string, any>;
  let mockEvaluator: IEvaluator & {
    _setReturnValues: (...values: any[]) => void;
  };

  test.beforeEach(() => {
    // Arrange
    evaluator = new UnaryExpressionEvaluator();
    mockScope = {};
    mockEvaluator = createSequencedEvaluator();
  });

  // ! operator
  test("should negate true to false", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "!",
      argument: { type: "Literal", value: true },
    };
    (mockEvaluator as any)._setReturnValues(true);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(false);
  });

  test("should negate false to true", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "!",
      argument: { type: "Literal", value: false },
    };
    (mockEvaluator as any)._setReturnValues(false);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  // - operator
  test("should negate positive number", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "-",
      argument: { type: "Literal", value: 42 },
    };
    (mockEvaluator as any)._setReturnValues(42);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(-42);
  });

  test("should negate negative number to positive", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "-",
      argument: { type: "Literal", value: -10 },
    };
    (mockEvaluator as any)._setReturnValues(-10);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(10);
  });

  // + operator
  test("should coerce string number to number", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "+",
      argument: { type: "Literal", value: "42" },
    };
    (mockEvaluator as any)._setReturnValues("42");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(42);
  });

  test("should coerce boolean true to 1", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "+",
      argument: { type: "Literal", value: true },
    };
    (mockEvaluator as any)._setReturnValues(true);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(1);
  });

  test("should throw error on unknown operator", () => {
    // Arrange
    const node: UnaryExpressionNode = {
      type: "UnaryExpression",
      operator: "~",
      argument: { type: "Literal", value: 5 },
    } as any;
    (mockEvaluator as any)._setReturnValues(5);

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      "Unknown unary operator: ~",
    );
  });
});
