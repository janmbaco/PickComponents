import { TokenType, type Token, type ASTNode } from "./types.js";

/**
 * Implements the responsibility of converting token sequences into Abstract Syntax Trees.
 * This recursive descent parser handles the complete expression grammar with proper
 * operator precedence. Follows SRP by focusing solely on parsing logic.
 */
export class Parser {
  private static readonly MAX_DEPTH = 32;
  private tokens: Token[];
  private position: number = 0;
  private depth: number = 0;

  /**
   * Initializes a new instance of Parser.
   *
   * @param tokens - The token sequence to parse
   * @throws Error if tokens is null or undefined
   */
  constructor(tokens: Token[]) {
    if (!tokens) throw new Error("Tokens array is required");
    this.tokens = tokens;
  }

  /**
   * Returns the current token without advancing the position.
   * @returns The current token
   * @private
   */
  private peek(): Token {
    return this.tokens[this.position];
  }

  /**
   * Returns the current token and advances the position.
   * @returns The current token
   * @private
   */
  private advance(): Token {
    return this.tokens[this.position++];
  }

  /**
   * Expects and consumes a token of the specified type.
   * @param type - The expected token type
   * @returns The consumed token
   * @throws Error if the current token doesn't match the expected type
   * @private
   */
  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(
        `Expected ${type} but got ${token.type} at position ${token.position}`,
      );
    }
    return this.advance();
  }

  /**
   * Parses the complete expression starting from the top level.
   * This is the main entry point for parsing.
   *
   * @returns The root AST node of the parsed expression
   * @throws Error if parsing fails due to syntax errors
   *
   * @example
   * ```typescript
   * const parser = new Parser(tokens);
   * const ast = parser.parse();
   * ```
   */
  public parse(): ASTNode {
    return this.parseConditional();
  }

  /**
   * Parses conditional (ternary) expressions: test ? consequent : alternate.
   * Has lower precedence than logical operators.
   *
   * @returns The parsed conditional or logical OR expression
   * @private
   */
  private parseConditional(): ASTNode {
    let node = this.parseLogicalOr();

    if (this.peek().type === TokenType.QUESTION) {
      if (++this.depth > Parser.MAX_DEPTH) {
        throw new Error(
          `Expression nesting depth exceeds maximum of ${Parser.MAX_DEPTH}`,
        );
      }

      try {
        this.advance(); // consume '?'
        const consequent = this.parseLogicalOr();
        this.expect(TokenType.COLON); // expect ':'
        const alternate = this.parseConditional(); // right-associative

        node = {
          type: "ConditionalExpression",
          test: node,
          consequent,
          alternate,
        };
      } finally {
        this.depth--;
      }
    }

    return node;
  }

  /**
   * Parses logical OR expressions (||).
   * Left-associative with lower precedence than logical AND.
   *
   * @returns The parsed logical OR expression
   * @private
   */
  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.peek().type === TokenType.OR) {
      const operator = this.advance().value;
      const right = this.parseLogicalAnd();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses logical AND expressions (&&).
   * Left-associative with higher precedence than logical OR.
   *
   * @returns The parsed logical AND expression
   * @private
   */
  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.peek().type === TokenType.AND) {
      const operator = this.advance().value;
      const right = this.parseEquality();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses equality expressions (===, !==).
   * Left-associative with higher precedence than logical operators.
   *
   * @returns The parsed equality expression
   * @private
   */
  private parseEquality(): ASTNode {
    let left = this.parseComparison();

    while ([TokenType.EQUAL, TokenType.NOT_EQUAL].includes(this.peek().type)) {
      const operator = this.advance().value;
      const right = this.parseComparison();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses comparison expressions (>, <, >=, <=).
   * Left-associative with higher precedence than equality operators.
   *
   * @returns The parsed comparison expression
   * @private
   */
  private parseComparison(): ASTNode {
    let left = this.parseAdditive();

    while (
      [TokenType.GT, TokenType.LT, TokenType.GTE, TokenType.LTE].includes(
        this.peek().type,
      )
    ) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses additive expressions (+, -).
   * Left-associative with higher precedence than comparison operators.
   *
   * @returns The parsed additive expression
   * @private
   */
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while ([TokenType.PLUS, TokenType.MINUS].includes(this.peek().type)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses multiplicative expressions (*, /, %).
   * Left-associative with higher precedence than additive operators.
   *
   * @returns The parsed multiplicative expression
   * @private
   */
  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();

    while (
      [TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO].includes(
        this.peek().type,
      )
    ) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * Parses unary expressions (!, -, +).
   * Right-associative with higher precedence than binary operators.
   *
   * @returns The parsed unary expression
   * @private
   */
  private parseUnary(): ASTNode {
    if (
      [TokenType.NOT, TokenType.MINUS, TokenType.PLUS].includes(
        this.peek().type,
      )
    ) {
      const operator = this.advance().value;
      const argument = this.parseUnary();
      return {
        type: "UnaryExpression",
        operator,
        argument,
      };
    }

    return this.parseCallOrMember();
  }

  /**
   * Parses member access and method calls (obj.prop, obj.method()).
   * Handles both property access and function calls with proper precedence.
   *
   * @returns The parsed member/call expression
   * @private
   */
  private parseCallOrMember(): ASTNode {
    let expr = this.parsePrimary();

    let keepParsing = true;
    while (keepParsing) {
      const token = this.peek();

      // Member access: obj.prop or obj?.prop
      if (
        token.type === TokenType.DOT ||
        token.type === TokenType.OPTIONAL_CHAIN
      ) {
        const optional = token.type === TokenType.OPTIONAL_CHAIN;
        this.advance();
        const property = this.expect(TokenType.IDENTIFIER);
        expr = {
          type: "MemberExpression",
          object: expr,
          property: { type: "Identifier", name: property.value },
          optional,
        };

        // Check for method call: obj.method()
        if (this.peek().type === TokenType.LPAREN) {
          this.advance(); // consume (
          const args: ASTNode[] = [];

          while (this.peek().type !== TokenType.RPAREN) {
            args.push(this.parseLogicalOr());
            if (this.peek().type === TokenType.COMMA) {
              this.advance();
            }
          }

          this.expect(TokenType.RPAREN);
          expr = {
            type: "CallExpression",
            callee: expr,
            arguments: args,
          };
        }
      } else {
        keepParsing = false;
      }
    }

    return expr;
  }

  /**
   * Parses primary expressions (literals, identifiers, parenthesized).
   * These are the highest precedence expressions that don't contain other expressions.
   *
   * @returns The parsed primary expression
   * @throws Error if an unexpected token is encountered
   * @private
   */
  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Number literal
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: "Literal",
        value: parseFloat(token.value),
      };
    }

    // String literal
    if (token.type === TokenType.STRING) {
      this.advance();
      return {
        type: "Literal",
        value: token.value,
      };
    }

    // Identifier
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return {
        type: "Identifier",
        name: token.value,
      };
    }

    // Parenthesized expression
    if (token.type === TokenType.LPAREN) {
      if (++this.depth > Parser.MAX_DEPTH) {
        throw new Error(
          `Expression nesting depth exceeds maximum of ${Parser.MAX_DEPTH}`,
        );
      }

      try {
        this.advance();
        const expr = this.parseLogicalOr();
        this.expect(TokenType.RPAREN);
        return expr;
      } finally {
        this.depth--;
      }
    }

    throw new Error(
      `Unexpected token ${token.type} at position ${token.position}`,
    );
  }
}
