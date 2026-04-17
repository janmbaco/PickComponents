import type { ASTNode, ParsedExpression } from "./types.js";

/**
 * Defines the responsibility of evaluating AST nodes within a given scope.
 * This interface enables dependency inversion for expression evaluation.
 */
export interface IEvaluator {
  /**
   * Evaluates an AST node within the provided scope.
   * @param node - The AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @returns The result of evaluating the AST node
   * @throws Error if evaluation fails or encounters invalid operations
   *
   * @example
   * ```typescript
   * const evaluator = new ASTEvaluator();
   * const result = evaluator.evaluate(astNode, { x: 42 });
   * ```
   */
  evaluate(node: ASTNode, scope: Record<string, unknown>): unknown;
}

/**
 * Defines the responsibility of parsing, evaluating, and analyzing expressions.
 * This interface follows Interface Segregation Principle by providing a unified
 * contract for expression processing operations used by rendering components.
 */
export interface IExpressionParser {
  /**
   * Parses an expression string into a structured representation.
   * @param expression - The expression string to parse
   * @returns The parsed expression with AST and dependencies
   * @throws Error if the expression contains syntax errors
   *
   * @example
   * ```typescript
   * const parsed = parser.parse('user.name + " " + user.age');
   * ```
   */
  parse(expression: string): ParsedExpression;
}
