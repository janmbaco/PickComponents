import { test, expect } from "@playwright/test";
import { CallExpressionEvaluator } from "../../../../src/rendering/expression-parser/evaluators/call.evaluator.js";
import { SafeMethodValidator } from "../../../../src/rendering/expression-parser/safe-methods.js";
import type {
  CallExpressionNode,
  MemberExpressionNode,
  IdentifierNode,
} from "../../../../src/rendering/expression-parser/types.js";
import type { IEvaluator } from "../../../../src/rendering/expression-parser/interfaces.js";
import { createSequencedEvaluator } from "../../../fixtures/mock-evaluator";

/**
 * Tests for CallExpressionEvaluator responsibility.
 *
 * Tests cover:
 * - Safe string methods (toUpperCase, substring)
 * - Safe array methods (join)
 * - Unsafe method prevention
 * - Property not a function error
 * - Error when object is null/undefined
 */

test.describe("CallExpressionEvaluator", () => {
  let evaluator: CallExpressionEvaluator;
  let mockScope: Record<string, any>;
  let mockEvaluator: IEvaluator & {
    _setReturnValues: (...values: any[]) => void;
  };

  test.beforeEach(() => {
    // Arrange
    evaluator = new CallExpressionEvaluator(new SafeMethodValidator());
    mockScope = {};
    mockEvaluator = createSequencedEvaluator();
  });

  test("should call toUpperCase on string", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "toUpperCase",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "str" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [],
    };
    (mockEvaluator as any)._setReturnValues("hello");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("HELLO");
  });

  test("should call substring on string with args", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "substring",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "str" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [
        { type: "Literal", value: 0 },
        { type: "Literal", value: 5 },
      ],
    };
    (mockEvaluator as any)._setReturnValues("hello world", 0, 5);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("hello");
  });

  test("should call join on array", () => {
    // Arrange
    const propertyNode: IdentifierNode = { type: "Identifier", name: "join" };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "items" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [{ type: "Literal", value: ", " }],
    };
    (mockEvaluator as any)._setReturnValues(["a", "b", "c"], ", ");

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("a, b, c");
  });

  test("should throw error when calling unsafe method on string", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "constructor",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "str" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [],
    };
    (mockEvaluator as any)._setReturnValues("hello");

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      /not allowed/,
    );
  });

  test("should throw error when property is not a function (overridden)", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "toString",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "obj" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [],
    };
    const obj: any = { toString: "not-a-function" };
    (mockEvaluator as any)._setReturnValues(obj);

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      '"toString" is not a function',
    );
  });

  test("should throw error when object is null", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "toUpperCase",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "str" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [],
    };
    (mockEvaluator as any)._setReturnValues(null);

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      "Cannot call method on null or undefined",
    );
  });

  test("should throw error when object is undefined", () => {
    // Arrange
    const propertyNode: IdentifierNode = {
      type: "Identifier",
      name: "toUpperCase",
    };
    const memberExpr: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "str" },
      property: propertyNode,
      optional: false,
    };
    const node: CallExpressionNode = {
      type: "CallExpression",
      callee: memberExpr,
      arguments: [],
    };
    (mockEvaluator as any)._setReturnValues(undefined);

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, mockEvaluator)).toThrow(
      "Cannot call method on null or undefined",
    );
  });
});
