import { test, expect } from "@playwright/test";
import { Parser } from "../../../../src/rendering/expression-parser/parser.js";
import { ExpressionParserMother } from "../../../fixtures/expression-parser.mother.js";

/**
 * Tests for Parser responsibility.
 *
 * Covers operator precedence, ternary right-associativity, optional chaining + call, and parenthesized precedence.
 */

test.describe("Parser", () => {
  test("should respect precedence: multiplicative before additive", () => {
    // Arrange
    const ast = new Parser(
      ExpressionParserMother.tokenize("a + b * 2"),
    ).parse();

    // Act

    // Assert
    expect(ast).toEqual({
      type: "BinaryExpression",
      operator: "+",
      left: { type: "Identifier", name: "a" },
      right: {
        type: "BinaryExpression",
        operator: "*",
        left: { type: "Identifier", name: "b" },
        right: { type: "Literal", value: 2 },
      },
    });
  });

  test("should parse ternary with right associativity on alternate", () => {
    // Arrange
    const ast = ExpressionParserMother.parse("a ? b : c ? d : e");

    // Act

    // Assert
    expect(ast).toEqual({
      type: "ConditionalExpression",
      test: { type: "Identifier", name: "a" },
      consequent: { type: "Identifier", name: "b" },
      alternate: {
        type: "ConditionalExpression",
        test: { type: "Identifier", name: "c" },
        consequent: { type: "Identifier", name: "d" },
        alternate: { type: "Identifier", name: "e" },
      },
    });
  });

  test("should parse optional chaining with method call", () => {
    // Arrange
    const ast = ExpressionParserMother.parse("user?.profile.getName()");

    // Act

    // Assert
    expect(ast).toEqual({
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "MemberExpression",
          object: { type: "Identifier", name: "user" },
          property: { type: "Identifier", name: "profile" },
          optional: true,
        },
        property: { type: "Identifier", name: "getName" },
        optional: false,
      },
      arguments: [],
    });
  });

  test("should parse parenthesized expression to override precedence", () => {
    // Arrange
    const ast = ExpressionParserMother.parse("(a + b) * c");

    // Act

    // Assert
    expect(ast).toEqual({
      type: "BinaryExpression",
      operator: "*",
      left: {
        type: "BinaryExpression",
        operator: "+",
        left: { type: "Identifier", name: "a" },
        right: { type: "Identifier", name: "b" },
      },
      right: { type: "Identifier", name: "c" },
    });
  });
  test("should throw on unexpected token", () => {
    // Arrange
    const parser = new Parser(ExpressionParserMother.tokenize("a + "));

    // Act & Assert
    expect(() => parser.parse()).toThrow(/Unexpected token/);
  });
});
