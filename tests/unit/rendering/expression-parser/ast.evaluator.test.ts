import { test, expect } from "@playwright/test";
import { ASTEvaluator } from "../../../../src/rendering/expression-parser/evaluators/ast.evaluator.js";
import { ExpressionParserService } from "../../../../src/rendering/expression-parser/expression-parser.service.js";
import { SafeMethodValidator } from "../../../../src/rendering/expression-parser/safe-methods.js";
import type { ASTNode } from "../../../../src/rendering/expression-parser/types.js";

/**
 * Tests for ASTEvaluator responsibility.
 *
 * Covers successful dispatch to registered strategies and error on unknown node type.
 */

test.describe("ASTEvaluator", () => {
  test("should evaluate literal node using registered strategy", () => {
    // Arrange
    const evaluator = new ASTEvaluator(new SafeMethodValidator());
    const node: ASTNode = { type: "Literal", value: 42 } as any;

    // Act
    const result = evaluator.evaluate(node, {});

    // Assert
    expect(result).toBe(42);
  });

  test("should throw for unknown node type", () => {
    // Arrange
    const evaluator = new ASTEvaluator(new SafeMethodValidator());
    const node = { type: "UnknownNode" } as any;

    // Act & Assert
    expect(() => evaluator.evaluate(node, {})).toThrow(
      "Unknown node type: UnknownNode",
    );
  });

  test("should throw when evaluation depth exceeds maximum", () => {
    // Arrange
    const evaluator = new ASTEvaluator(new SafeMethodValidator());

    // Build a deeply nested MemberExpression AST manually (65 levels)
    let node: ASTNode = { type: "Identifier", name: "x" } as any;
    for (let i = 0; i < 65; i++) {
      node = {
        type: "MemberExpression",
        object: node,
        property: { type: "Identifier", name: "a" },
        optional: false,
      } as any;
    }

    // Act & Assert
    expect(() => evaluator.evaluate(node, { x: {} })).toThrow(
      "Expression evaluation depth exceeds maximum of 64",
    );
  });
});

test.describe("ASTEvaluator — ternary expressions with nested scope", () => {
  test("should evaluate $item.done ternary to empty string when done is false", () => {
    // Arrange
    const service = new ExpressionParserService();
    const evaluator = new ASTEvaluator(new SafeMethodValidator());
    const parsed = service.parse("$item.done ? 'done' : ''");
    const scope = { $item: { done: false, id: 1, text: "test" } };

    // Act
    const result = evaluator.evaluate(parsed.ast, scope);

    // Assert
    expect(result).toBe("");
  });

  test("should evaluate $item.done ternary to done when done is true", () => {
    // Arrange
    const service = new ExpressionParserService();
    const evaluator = new ASTEvaluator(new SafeMethodValidator());
    const parsed = service.parse("$item.done ? 'done' : ''");
    const scope = { $item: { done: true, id: 1, text: "test" } };

    // Act
    const result = evaluator.evaluate(parsed.ast, scope);

    // Assert
    expect(result).toBe("done");
  });

  test("should evaluate $item.done ternary to strikethrough when done is true", () => {
    // Arrange
    const service = new ExpressionParserService();
    const evaluator = new ASTEvaluator(new SafeMethodValidator());
    const parsed = service.parse("$item.done ? 'strikethrough' : ''");
    const scope = { $item: { done: true, id: 1, text: "test" } };

    // Act
    const result = evaluator.evaluate(parsed.ast, scope);

    // Assert
    expect(result).toBe("strikethrough");
  });
});
