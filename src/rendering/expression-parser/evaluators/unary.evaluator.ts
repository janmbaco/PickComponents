import type { ASTNode, UnaryExpressionNode } from "../types.js";
import type { IEvaluator } from "../interfaces.js";
import type { INodeEvaluatorStrategy } from "./base.js";

/**
 * Implements the responsibility of evaluating unary expression AST nodes.
 * Handles logical negation, numeric negation, and numeric coercion operations.
 */
export class UnaryExpressionEvaluator implements INodeEvaluatorStrategy {
  private readonly operators: Record<string, (arg: unknown) => unknown> = {
    "!": (arg) => !arg,
    "-": (arg) => -(arg as number),
    "+": (arg) => +(arg as number),
  };

  /**
   * Evaluates a unary expression AST node by applying the operator to its operand.
   *
   * @param node - The unary expression AST node to evaluate
   * @param scope - The evaluation scope containing variable bindings
   * @param evaluator - The main evaluator instance for recursive evaluation
   * @returns The result of applying the unary operator to the operand
   * @throws Error if node, scope, or evaluator is null/undefined, or if operator is unknown
   *
   * @example
   * ```typescript
   * const evaluator = new UnaryExpressionEvaluator();
   * const scope = { x: 5 };
   * const result = evaluator.evaluate(unaryNode, scope, evaluator);
   * // Returns -5 for -x
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

    const unaryExpr = node as UnaryExpressionNode;
    const arg = evaluator.evaluate(unaryExpr.argument, scope);

    const operation = this.operators[unaryExpr.operator];
    if (!operation) {
      throw new Error(`Unknown unary operator: ${unaryExpr.operator}`);
    }

    return operation(arg);
  }
}
