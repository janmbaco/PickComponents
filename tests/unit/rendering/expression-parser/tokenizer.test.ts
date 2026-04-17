import { test, expect } from "@playwright/test";
import { Tokenizer } from "../../../../src/rendering/expression-parser/tokenizer.js";
import { TokenType } from "../../../../src/rendering/expression-parser/types.js";

/**
 * Tests for Tokenizer responsibility.
 *
 * Covers identifiers, strings with escapes, operators (===, ?.), and EOF sentinel.
 */

test.describe("Tokenizer", () => {
  test("should tokenize identifier, strict equality, and string literal", () => {
    // Arrange
    const tokenizer = new Tokenizer("pais === 'España'");

    // Act
    const tokens = tokenizer.tokenize();

    // Assert
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.EQUAL,
      TokenType.STRING,
      TokenType.EOF,
    ]);
    expect(tokens[0].value).toBe("pais");
    expect(tokens[2].value).toBe("España");
  });

  test("should tokenize optional chaining between identifiers", () => {
    // Arrange
    const tokenizer = new Tokenizer("user?.profile");

    // Act
    const tokens = tokenizer.tokenize();

    // Assert
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.OPTIONAL_CHAIN,
      TokenType.IDENTIFIER,
      TokenType.EOF,
    ]);
  });

  test("should handle escaped characters inside strings", () => {
    // Arrange
    const tokenizer = new Tokenizer("'line\\nnext'");

    // Act
    const tokens = tokenizer.tokenize();

    // Assert
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe("line\nnext");
  });

  test("should throw on unexpected character", () => {
    // Arrange
    const tokenizer = new Tokenizer("abc @");

    // Act & Assert
    expect(() => tokenizer.tokenize()).toThrow(
      'Unexpected character "@" at position 4',
    );
  });

  test("should tokenize decimal numbers", () => {
    // Arrange
    const tokenizer = new Tokenizer("total * 2.5");

    // Act
    const tokens = tokenizer.tokenize();

    // Assert
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.MULTIPLY,
      TokenType.NUMBER,
      TokenType.EOF,
    ]);
    expect(tokens[2].value).toBe("2.5");
  });

  test("should throw on unterminated string", () => {
    // Arrange
    const tokenizer = new Tokenizer("'oops");

    // Act & Assert
    expect(() => tokenizer.tokenize()).toThrow(
      "Unterminated string at position 5",
    );
  });
});
