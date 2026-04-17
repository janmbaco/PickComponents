import { test, expect } from "@playwright/test";
import { MemberExpressionEvaluator } from "../../../../src/rendering/expression-parser/evaluators/member.evaluator.js";
import type {
  MemberExpressionNode,
  IdentifierNode,
} from "../../../../src/rendering/expression-parser/types.js";
import type { IEvaluator } from "../../../../src/rendering/expression-parser/interfaces.js";

/**
 * Tests for MemberExpressionEvaluator responsibility.
 *
 * Tests cover:
 * - Property access on object
 * - Optional chaining on null/undefined
 * - Error when node/scope/evaluator is null
 */

test.describe("MemberExpressionEvaluator", () => {
  let evaluator: MemberExpressionEvaluator;
  let mockScope: Record<string, any>;
  let mockEvaluator: IEvaluator & { _setReturnValue: (v: any) => void };

  test.beforeEach(() => {
    // Arrange
    evaluator = new MemberExpressionEvaluator();
    mockScope = {};
    let value: any = undefined;
    mockEvaluator = {
      evaluate: () => value,
      _setReturnValue: (v: any) => {
        value = v;
      },
    } as any;
  });

  test("should access property on object", () => {
    // Arrange
    const propertyNode: IdentifierNode = { type: "Identifier", name: "name" };
    const node: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "user" },
      property: propertyNode,
      optional: false,
    };
    (mockEvaluator as any)._setReturnValue({ name: "John", age: 30 });

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBe("John");
  });

  test("should return undefined on optional chaining when object is null", () => {
    // Arrange
    const propertyNode: IdentifierNode = { type: "Identifier", name: "age" };
    const node: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "user" },
      property: propertyNode,
      optional: true,
    };
    (mockEvaluator as any)._setReturnValue(null);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBeUndefined();
  });

  test("should return null when object is null and optional is false", () => {
    // Arrange
    const propertyNode: IdentifierNode = { type: "Identifier", name: "age" };
    const node: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "user" },
      property: propertyNode,
      optional: false,
    };
    (mockEvaluator as any)._setReturnValue(null);

    // Act
    const result = evaluator.evaluate(node, mockScope, mockEvaluator);

    // Assert
    expect(result).toBeNull();
  });

  test("should throw error when node is null", () => {
    // Act & Assert
    expect(() =>
      evaluator.evaluate(null as any, mockScope, mockEvaluator),
    ).toThrow("Node is required");
  });

  test("should throw error when scope is null", () => {
    // Arrange
    const node: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "user" },
      property: { type: "Identifier", name: "age" },
      optional: false,
    };

    // Act & Assert
    expect(() => evaluator.evaluate(node, null as any, mockEvaluator)).toThrow(
      "Scope is required",
    );
  });

  test("should throw error when evaluator is null", () => {
    // Arrange
    const node: MemberExpressionNode = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "user" },
      property: { type: "Identifier", name: "age" },
      optional: false,
    };

    // Act & Assert
    expect(() => evaluator.evaluate(node, mockScope, null as any)).toThrow(
      "Evaluator is required",
    );
  });
});
