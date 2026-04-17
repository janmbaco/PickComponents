import { test, expect } from "@playwright/test";
import { ConditionalExpressionEvaluator } from "../../../../src/rendering/expression-parser/evaluators/conditional.evaluator.js";
import type { ConditionalExpressionNode } from "../../../../src/rendering/expression-parser/types.js";
import type { IEvaluator } from "../../../../src/rendering/expression-parser/interfaces.js";
import { createSequencedEvaluator } from "../../../fixtures/mock-evaluator";

/**
 * Tests for ConditionalExpressionEvaluator responsibility.
 *
 * Tests cover:
 * - Ternary operator branches (truthy/falsy)
 * - Various truthiness cases (number, string, object, null, undefined, 0, '')
 */

test.describe("ConditionalExpressionEvaluator", () => {
  let evaluator: ConditionalExpressionEvaluator;
  let mockScope: Record<string, any>;
  let mockEvaluator: IEvaluator & {
    _setReturnValues: (...values: any[]) => void;
    _reset?: () => void;
  };

  test.beforeEach(() => {
    // Arrange
    evaluator = new ConditionalExpressionEvaluator();
    mockScope = {};
    mockEvaluator = createSequencedEvaluator();
  });

  test("should return consequent when test is true", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: true },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(true, "yes");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("yes");
  });

  test("should return consequent when test is truthy number", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: 1 },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(1, "yes");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("yes");
  });

  test("should return consequent when test is truthy string", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: "hello" },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues("hello", "yes");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("yes");
  });

  test("should return consequent when test is truthy object", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Identifier", name: "obj" },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues({ a: 1 }, "yes");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("yes");
  });

  test("should return alternate when test is false", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: false },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(false, "no");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("no");
  });

  test("should return alternate when test is null", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Identifier", name: "value" },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(null, "no");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("no");
  });

  test("should return alternate when test is undefined", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Identifier", name: "value" },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(undefined, "no");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("no");
  });

  test("should return alternate when test is zero", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: 0 },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues(0, "no");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("no");
  });

  test("should return alternate when test is empty string", () => {
    // Arrange
    const node: ConditionalExpressionNode = {
      type: "ConditionalExpression",
      test: { type: "Literal", value: "" },
      consequent: { type: "Literal", value: "yes" },
      alternate: { type: "Literal", value: "no" },
    };
    (mockEvaluator as any)._setReturnValues("", "no");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("no");
  });
});
