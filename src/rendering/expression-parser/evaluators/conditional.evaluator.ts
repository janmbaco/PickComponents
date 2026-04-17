import type { ASTNode, ConditionalExpressionNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating conditional (ternary) expression AST nodes.
 * Handles the conditional operator (condition ? consequent : alternate) evaluation.
 */
export class ConditionalExpressionEvaluator implements INodeEvaluatorStrategy {
  /**
   * Evaluates a conditional expression AST node by testing the condition
   * and returning either the consequent or alternate value.
   *
   * @param node - The conditional expression AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The result of the conditional expression (consequent if test is truthy, alternate otherwise)
   * @throws Error if node, scope, or evaluator is null/undefined
   *
   * @example
   * ```typescript
   * const evaluator = new ConditionalExpressionEvaluator();
   * const scope = { condition: true, a: 1, b: 2 };
   * const result = evaluator.evaluate(conditionalNode, scope, evaluator);
   * // Returns 1 for condition ? a : b when condition is true
   * ```
   */
  evaluate(
    node: ASTNode,
    scope: Record<string, unknown>,
    evaluator: IEvaluator,
  ): unknown {
    if (!node) throw new Error("Node is required");
    if (!scope) throw new Error("Scope is required");
    if (!evaluator) throw new Error("Evaluator is required");

    const conditionalExpr = node as ConditionalExpressionNode;
    const test = evaluator.evaluate(conditionalExpr.test, scope);
    return test
      ? evaluator.evaluate(conditionalExpr.consequent, scope)
      : evaluator.evaluate(conditionalExpr.alternate, scope);
  }
}
