import { test, expect } from "@playwright/test";
import { BinaryExpressionEvaluator } from "../../../../src/rendering/expression-parser/evaluators/binary.evaluator.js";
import type { BinaryExpressionNode } from "../../../../src/rendering/expression-parser/types.js";
import type { IEvaluator } from "../../../../src/rendering/expression-parser/interfaces.js";
import { createSequencedEvaluator } from "../../../fixtures/mock-evaluator";

/**
 * Tests for BinaryExpressionEvaluator responsibility.
 *
 * Tests cover:
 * - Arithmetic operations (+, -, *, /, %)
 * - Comparison operations (===, !==, >, <, >=, <=)
 * - Logical operations (&&, ||)
 * - Unknown operator error
 */

test.describe("BinaryExpressionEvaluator", () => {
  let evaluator: BinaryExpressionEvaluator;
  let mockScope: Record<string, any>;
  let mockEvaluator: IEvaluator & {
    _setReturnValues: (...values: any[]) => void;
  };

  test.beforeEach(() => {
    // Arrange
    evaluator = new BinaryExpressionEvaluator();
    mockScope = {};
    mockEvaluator = createSequencedEvaluator();
  });

  // Arithmetic
  test("should add two numbers", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "+",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 3 },
    };
    (mockEvaluator as any)._setReturnValues(5, 3);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(8);
  });

  test("should subtract two numbers", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "-",
      left: { type: "Literal", value: 10 },
      right: { type: "Literal", value: 4 },
    };
    (mockEvaluator as any)._setReturnValues(10, 4);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(6);
  });

  test("should multiply two numbers", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "*",
      left: { type: "Literal", value: 4 },
      right: { type: "Literal", value: 5 },
    };
    (mockEvaluator as any)._setReturnValues(4, 5);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(20);
  });

  test("should divide two numbers", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "/",
      left: { type: "Literal", value: 20 },
      right: { type: "Literal", value: 4 },
    };
    (mockEvaluator as any)._setReturnValues(20, 4);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(5);
  });

  test("should calculate modulo", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "%",
      left: { type: "Literal", value: 17 },
      right: { type: "Literal", value: 5 },
    };
    (mockEvaluator as any)._setReturnValues(17, 5);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(2);
  });

  // Comparison
  test("should return true for strict equality", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "===",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 5 },
    };
    (mockEvaluator as any)._setReturnValues(5, 5);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should return false for strict equality mismatch", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "===",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 3 },
    };
    (mockEvaluator as any)._setReturnValues(5, 3);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(false);
  });

  test("should return true for not equal", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "!==",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 3 },
    };
    (mockEvaluator as any)._setReturnValues(5, 3);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should return true for strict string equality", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "===",
      left: { type: "Literal", value: "Spain" },
      right: { type: "Literal", value: "Spain" },
    };
    (mockEvaluator as any)._setReturnValues("Spain", "Spain");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should return false for strict string inequality", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "===",
      left: { type: "Literal", value: "Spain" },
      right: { type: "Literal", value: "Mexico" },
    };
    (mockEvaluator as any)._setReturnValues("Spain", "Mexico");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(false);
  });

  test("should compare greater than", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: ">",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 3 },
    };
    (mockEvaluator as any)._setReturnValues(5, 3);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should compare less than", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "<",
      left: { type: "Literal", value: 3 },
      right: { type: "Literal", value: 5 },
    };
    (mockEvaluator as any)._setReturnValues(3, 5);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should compare greater than or equal", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: ">=",
      left: { type: "Literal", value: 10 },
      right: { type: "Literal", value: 10 },
    };
    (mockEvaluator as any)._setReturnValues(10, 10);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should compare less than or equal", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "<=",
      left: { type: "Literal", value: 5 },
      right: { type: "Literal", value: 10 },
    };
    (mockEvaluator as any)._setReturnValues(5, 10);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  // Logical
  test("should perform logical AND", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "&&",
      left: { type: "Literal", value: true },
      right: { type: "Literal", value: true },
    };
    (mockEvaluator as any)._setReturnValues(true, true);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should perform logical OR", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "||",
      left: { type: "Literal", value: false },
      right: { type: "Literal", value: true },
    };
    (mockEvaluator as any)._setReturnValues(false, true);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe(true);
  });

  test("should throw error on unknown operator", () => {
    // Arrange
    const node: BinaryExpressionNode = {
      type: "BinaryExpression",
      operator: "??",
      left: { type: "Literal", value: 1 },
      right: { type: "Literal", value: 2 },
    } as any;
    (mockEvaluator as any)._setReturnValues(1, 2);

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      "Unknown operator: ??",
    );
  });
});
