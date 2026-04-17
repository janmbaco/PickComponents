/**
 * Defines factory helpers for expression parser tests.
 */
import { Tokenizer } from "../../src/rendering/expression-parser/tokenizer.js";
import { Parser } from "../../src/rendering/expression-parser/parser.js";
import { ExpressionParserService } from "../../src/rendering/expression-parser/expression-parser.service.js";
import type {
  ASTNode,
  ParsedExpression,
  Token,
} from "../../src/rendering/expression-parser/types.js";

/**
 * Implements helpers to build tokens, ASTs, and parsed expressions for tests.
 */
export class ExpressionParserMother {
  /**
   * Tokenizes an expression string.
   * @param expression - The expression to tokenize
   */
  static tokenize(expression: string): Token[] {
    return new Tokenizer(expression).tokenize();
  }

  /**
   * Parses an expression string into an AST node.
   * @param expression - The expression to parse
   */
  static parse(expression: string): ASTNode {
    return new Parser(this.tokenize(expression)).parse();
  }

  /**
   * Builds a parsed expression with dependencies using the real service.
   * @param expression - The expression to parse and analyze
   */
  static parsed(expression: string): ParsedExpression {
    return new ExpressionParserService().parse(expression);
  }
}
